import { Request, Response } from 'express';
import { db, Device } from '../config/db';
import { keepStateOnError } from '../config/persistence';
import { DeviceRequest, DEVICE_UNLINKED_MESSAGE } from '../middleware/device.middleware';
import { getBlocklistFor } from '../services/blocklist.service';
import {
  claimThrottleKey,
  isClaimThrottled,
  registerClaimFailure,
  releaseClaimFailure
} from '../services/claimThrottle.service';
import {
  checkResponsiblePin,
  consumeLinkCode,
  createDeviceAlert,
  isLinkCodeActive,
  isValidPin,
  issueDeviceSecret,
  LINK_CODE_MAX_ATTEMPTS,
  normalizeDeviceStatus,
  normalizeLinkCode,
  PIN_LENGTH,
  pinLockedMessage,
  pinLockRemainingMinutes,
  resetDeviceLink
} from '../services/device.service';
import { isSecurityEventType, recordDeviceEvent } from '../services/event.service';
import { getResponsiblePushToken, sendPushNotification } from '../services/push.service';

/**
 * Rutas del celular del menor vinculado por código: POST /api/devices/claim y
 * /api/devices/me/*. El celular no tiene la sesión del adulto: se identifica
 * con la credencial opaca que recibe al vincularse ("Authorization: Device ...")
 * y cada cambio importante pide el PIN del adulto.
 */

/** Mismo mensaje para código inexistente, vencido, usado o PIN incorrecto: no da pistas. */
const CLAIM_GENERIC_ERROR = 'El código o el PIN no son correctos, o el código venció.';
const CLAIM_FORMAT_ERROR = 'Revisá el código: tiene 8 letras y números';
const CLAIM_THROTTLED_ERROR = 'Demasiados intentos. Probá de nuevo en unos minutos.';

/**
 * Lo que ve el celular de sí mismo. Sin responsibleId, fecha de nacimiento ni
 * código: el celular del menor no necesita esos datos.
 */
const toDeviceSelf = (device: Device) => ({
  id: device.id,
  deviceName: device.deviceName,
  status: device.status,
  lastSeen: device.lastSeen,
  ...(device.linkedAt ? { linkedAt: device.linkedAt } : {})
});

/** Avisa al adulto por push si tiene token registrado (si falla, no corta). */
const notifyResponsible = (responsibleId: string, title: string, body: string): void => {
  const pushToken = getResponsiblePushToken(responsibleId);
  if (pushToken) {
    sendPushNotification(pushToken, { title, body });
  }
};

/**
 * POST /api/devices/claim (público)
 * Vincula el celular del menor con el código que generó el adulto y su PIN.
 * Devuelve una credencial opaca que solo se entrega esta vez.
 *
 * Defensas: límite de intentos fallidos por IP, el bloqueo del PIN del adulto
 * (5 intentos / 15 min, compartido con el resto de la app) y, a los 5 PIN
 * incorrectos con un mismo código, el código se invalida.
 */
export const claimDevice = async (req: Request, res: Response) => {
  try {
    const { linkCode: rawCode, pin } = (req.body ?? {}) as { linkCode?: unknown; pin?: unknown };

    const linkCode = normalizeLinkCode(rawCode);
    if (!linkCode) {
      return res.status(400).json({ error: CLAIM_FORMAT_ERROR });
    }

    if (!isValidPin(pin)) {
      return res.status(400).json({
        error: `El PIN debe tener exactamente ${PIN_LENGTH} dígitos numéricos`
      });
    }

    const throttleKey = claimThrottleKey(req.ip);
    keepStateOnError(res);
    if (isClaimThrottled(throttleKey)) {
      return res.status(429).json({ error: CLAIM_THROTTLED_ERROR });
    }

    // Los intentos se cuentan ANTES de esperar a bcrypt y se descuentan si la
    // vinculación sale bien: si se contaran al fallar, una ráfaga de pedidos en
    // paralelo pasaría todos los límites mientras se comparan los PIN.
    // Se guardan aunque la respuesta sea un error (keepStateOnError).
    registerClaimFailure(throttleKey);
    const fail = (status: 401 | 429 = 401, error = CLAIM_GENERIC_ERROR) =>
      res.status(status).json({ error });

    const device = db.devices.find(d => d.linkCode === linkCode && isLinkCodeActive(d));
    if (!device) {
      return fail();
    }

    const responsible = db.responsables.find(r => r.id === device.responsibleId);
    // Sin PIN configurado no se puede vincular, pero no se le cuenta a quien prueba.
    if (!responsible || !responsible.pinHash) {
      return fail();
    }

    const lockedBefore = pinLockRemainingMinutes(responsible);
    if (lockedBefore > 0) {
      return fail(429, pinLockedMessage(lockedBefore));
    }

    // Reserva del intento con este código: al quinto, el código deja de servir
    // para cualquier otro pedido. Si justo este trae el PIN correcto, igual vincula.
    const codeAttempts = (device.linkFailedAttempts ?? 0) + 1;
    let invalidatedAt: string | undefined;
    if (codeAttempts >= LINK_CODE_MAX_ATTEMPTS) {
      consumeLinkCode(device);
      invalidatedAt = device.linkCodeUsedAt;
    } else {
      device.linkFailedAttempts = codeAttempts;
    }

    const check = await checkResponsiblePin(responsible, pin);
    if (!check.ok) {
      return check.lockedMinutes > 0 ? fail(429, pinLockedMessage(check.lockedMinutes)) : fail();
    }

    // Mientras se verificaba el PIN otro pedido pudo haber usado el código. Si lo
    // invalidó este mismo pedido (quinto intento), sigue valiendo solo para él.
    const stillUsable =
      isLinkCodeActive(device) ||
      (invalidatedAt !== undefined &&
        device.status === 'pending' &&
        device.linkCodeUsedAt === invalidatedAt &&
        !device.deviceSecretHash &&
        Date.parse(device.linkCodeExpiresAt ?? '') > Date.now());
    if (!stillUsable) {
      return fail();
    }

    releaseClaimFailure(throttleKey);
    const now = new Date().toISOString();
    consumeLinkCode(device);
    device.status = 'active';
    device.linkedAt = now;
    device.lastSeen = now;
    const deviceAccessToken = issueDeviceSecret(device);

    createDeviceAlert({
      responsibleId: device.responsibleId,
      deviceId: device.id,
      alertType: 'DEVICE_LINKED',
      message: `Dispositivo protegido "${device.deviceName}" vinculado exitosamente.`
    });
    notifyResponsible(
      device.responsibleId,
      'Celular vinculado',
      `"${device.deviceName}" ya está protegido con BA Protege+.`
    );

    return res.status(200).json({
      message: 'Vinculación confirmada',
      device: {
        id: device.id,
        deviceName: device.deviceName,
        status: device.status,
        linkedAt: device.linkedAt
      },
      deviceAccessToken
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/** Dispositivo del pedido; authenticateDevice ya verificó que existe y está vinculado. */
const currentDevice = (req: DeviceRequest): Device | undefined =>
  db.devices.find(d => d.id === req.deviceId);

/**
 * Pide el PIN del adulto en las rutas /me. Si no es válido, responde y
 * devuelve false. Comparte el bloqueo de 5 intentos con el resto de la app.
 *
 * El PIN incorrecto responde 401 con `code: 'INVALID_PIN'`, para que la app no
 * lo confunda con la credencial revocada (`code: 'DEVICE_UNLINKED'`).
 */
const requireResponsiblePin = async (
  req: DeviceRequest,
  res: Response,
  pin: unknown
): Promise<boolean> => {
  if (!isValidPin(pin)) {
    res.status(400).json({ error: `El PIN debe tener exactamente ${PIN_LENGTH} dígitos numéricos` });
    return false;
  }

  const responsible = db.responsables.find(r => r.id === req.responsibleId);
  if (!responsible || !responsible.pinHash) {
    res.status(409).json({ error: 'El responsable todavía no configuró un PIN de seguridad' });
    return false;
  }

  keepStateOnError(res);
  const check = await checkResponsiblePin(responsible, pin);
  if (!check.ok) {
    if (check.lockedMinutes > 0) {
      res.status(429).json({ error: pinLockedMessage(check.lockedMinutes) });
    } else {
      res.status(401).json({ error: 'El PIN no es correcto.', code: 'INVALID_PIN' });
    }
    return false;
  }
  return true;
};

/**
 * GET /api/devices/me
 * Estado del celular vinculado. La app lo consulta seguido: sirve también de
 * latido (actualiza lastSeen; como es un GET, no se persiste en cada pedido).
 */
export const getMyDevice = async (req: DeviceRequest, res: Response) => {
  try {
    const device = currentDevice(req);
    if (!device) {
      return res.status(401).json({ error: DEVICE_UNLINKED_MESSAGE, code: 'DEVICE_UNLINKED' });
    }
    device.lastSeen = new Date().toISOString();
    return res.status(200).json({ device: toDeviceSelf(device) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/devices/me/blocklist
 * Lista que aplica la VPN del celular: la oficial de LOTBA más los sitios
 * personalizados del adulto dueño. Misma forma que GET /api/blocklist.
 */
export const getMyBlocklist = async (req: DeviceRequest, res: Response) => {
  try {
    return res.status(200).json(getBlocklistFor(req.responsibleId));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/devices/me/events
 * Registra un evento de seguridad de este celular. El dispositivo sale de la
 * credencial, no del cuerpo: un celular no puede generar eventos de otro.
 */
export const recordMyEvent = async (req: DeviceRequest, res: Response) => {
  try {
    const { eventType, domain, details } = (req.body ?? {}) as {
      eventType?: unknown;
      domain?: unknown;
      details?: unknown;
    };

    if (!eventType || typeof details !== 'string' || !details.trim()) {
      return res.status(400).json({ error: 'eventType y details son obligatorios' });
    }

    if (!isSecurityEventType(eventType)) {
      return res.status(400).json({ error: 'Invalid eventType' });
    }

    const device = currentDevice(req);
    if (!device) {
      return res.status(401).json({ error: DEVICE_UNLINKED_MESSAGE, code: 'DEVICE_UNLINKED' });
    }

    const event = recordDeviceEvent({
      device,
      eventType,
      domain: typeof domain === 'string' && domain.trim() ? domain.trim() : undefined,
      details
    });

    return res.status(201).json({ message: 'Event recorded successfully', event });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/devices/me/verify-pin
 * Verifica el PIN del adulto desde el celular (por ejemplo, antes de mostrar
 * opciones protegidas). 200 { valid: true } | 401 | 429.
 */
export const verifyMyDevicePin = async (req: DeviceRequest, res: Response) => {
  try {
    const { pin } = (req.body ?? {}) as { pin?: unknown };
    if (!(await requireResponsiblePin(req, res, pin))) return;
    return res.status(200).json({ message: 'PIN válido', valid: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * PATCH /api/devices/me/status
 * Pausa o reactiva la protección desde el celular, con el PIN del adulto.
 * Queda registrado como PROTECTION_MODIFIED en el historial.
 */
export const updateMyDeviceStatus = async (req: DeviceRequest, res: Response) => {
  try {
    const { status, pin } = (req.body ?? {}) as { status?: unknown; pin?: unknown };

    const normalizedStatus = normalizeDeviceStatus(status);
    if (normalizedStatus !== 'active' && normalizedStatus !== 'inactive') {
      return res.status(400).json({ error: 'El estado tiene que ser active o inactive' });
    }

    if (!(await requireResponsiblePin(req, res, pin))) return;

    const device = currentDevice(req);
    if (!device) {
      return res.status(401).json({ error: DEVICE_UNLINKED_MESSAGE, code: 'DEVICE_UNLINKED' });
    }

    device.status = normalizedStatus;
    device.lastSeen = new Date().toISOString();

    recordDeviceEvent({
      device,
      eventType: 'PROTECTION_MODIFIED',
      details:
        normalizedStatus === 'active'
          ? 'Se reactivó la protección en este celular'
          : 'Se pausó la protección en este celular'
    });

    return res.status(200).json({
      message: 'Device status updated successfully',
      device: toDeviceSelf(device)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/devices/me/unlink
 * Desvincula este celular con el PIN del adulto: revoca la credencial, el
 * dispositivo vuelve a "pending" con un código nuevo y el adulto recibe una alerta.
 */
export const unlinkMyDevice = async (req: DeviceRequest, res: Response) => {
  try {
    const { pin } = (req.body ?? {}) as { pin?: unknown };
    if (!(await requireResponsiblePin(req, res, pin))) return;

    const device = currentDevice(req);
    if (!device) {
      return res.status(401).json({ error: DEVICE_UNLINKED_MESSAGE, code: 'DEVICE_UNLINKED' });
    }

    resetDeviceLink(device);

    const message = `El celular de ${device.deviceName} se desvinculó. Generá un código nuevo para volver a protegerlo.`;
    createDeviceAlert({
      responsibleId: device.responsibleId,
      deviceId: device.id,
      alertType: 'DEVICE_UNLINKED',
      message
    });
    notifyResponsible(device.responsibleId, 'Celular desvinculado', message);

    return res.status(200).json({ message: 'Este celular se desvinculó' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
