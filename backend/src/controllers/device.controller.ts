import { Response } from 'express';
import { db, DeviceStatus } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { keepStateOnError } from '../config/persistence';
import { setResponsiblePushToken } from '../services/push.service';
import {
  buildPendingDevice,
  checkResponsiblePin,
  consumeLinkCode,
  createDeviceAlert,
  findResponsibleDevice,
  isAwaitingRelink,
  isValidPin,
  issueLinkCode,
  normalizeDeviceStatus,
  PIN_LENGTH,
  pinLockedMessage,
  resetDeviceLink,
  toPublicDevice
} from '../services/device.service';

const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEVICE_NAME_MIN = 2;
const DEVICE_NAME_MAX = 40;

/**
 * POST /api/devices/link
 * El adulto responsable registra el dispositivo del menor (nombre y fecha de
 * nacimiento). El dispositivo queda en estado "pending" con un linkCode vigente
 * (LINK_CODE_TTL_MINUTES) con el que se vincula el celular del menor.
 */
export const linkDevice = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId!;
    const { deviceName, fechaNacimiento, deviceToken } = req.body;

    if (!deviceName || typeof deviceName !== 'string') {
      return res.status(400).json({ error: 'Device name is required' });
    }

    if (!fechaNacimiento || typeof fechaNacimiento !== 'string') {
      return res.status(400).json({ error: 'fechaNacimiento is required' });
    }

    if (!BIRTH_DATE_REGEX.test(fechaNacimiento)) {
      return res.status(400).json({ error: 'fechaNacimiento must use the YYYY-MM-DD format' });
    }

    const cleanName = deviceName.trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Device name is required' });
    }

    const nameLength = Array.from(cleanName).length;
    if (nameLength < DEVICE_NAME_MIN || nameLength > DEVICE_NAME_MAX) {
      return res.status(400).json({
        error: `El nombre tiene que tener entre ${DEVICE_NAME_MIN} y ${DEVICE_NAME_MAX} caracteres`
      });
    }

    const newDevice = buildPendingDevice({
      responsibleId,
      deviceName: cleanName,
      fechaNacimiento,
      deviceToken: typeof deviceToken === 'string' ? deviceToken : undefined
    });

    db.devices.push(newDevice);

    // Alerta/log de auditoría: el dispositivo quedó pendiente de vinculación.
    createDeviceAlert({
      responsibleId,
      deviceId: newDevice.id,
      alertType: 'DEVICE_PENDING',
      message: `Dispositivo protegido "${cleanName}" creado. Pendiente de vincular con el PIN de seguridad.`
    });

    return res.status(201).json({
      message: 'Device registered successfully. Pending confirmation.',
      device: toPublicDevice(newDevice),
      deviceId: newDevice.id,
      linkCode: newDevice.linkCode,
      linkCodeExpiresAt: newDevice.linkCodeExpiresAt
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/devices/confirm-link
 * La app del dispositivo protegido confirma el vínculo enviando el deviceId
 * (o el linkCode) y el PIN de 4 dígitos del adulto responsable.
 *
 * El PIN se valida contra el hash almacenado y el dispositivo pasa de
 * "pending" a "active".
 */
export const confirmDeviceLink = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId!;
    const { deviceId, linkCode, pin } = req.body;

    if (!deviceId && !linkCode) {
      return res.status(400).json({ error: 'deviceId or linkCode is required' });
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'pin is required' });
    }

    const responsible = db.responsables.find(r => r.id === responsibleId);
    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    const device = findResponsibleDevice(responsibleId, { deviceId, linkCode });
    if (!device) {
      return res.status(404).json({ error: 'Device not found or unauthorized' });
    }

    if (device.status === 'active') {
      return res.status(409).json({ error: 'Device is already linked' });
    }

    if (!responsible.pinHash) {
      return res.status(409).json({
        error: 'El responsable todavía no configuró un PIN de seguridad'
      });
    }

    keepStateOnError(res);
    const check = await checkResponsiblePin(responsible, pin);
    if (!check.ok) {
      return check.lockedMinutes > 0
        ? res.status(429).json({ error: pinLockedMessage(check.lockedMinutes) })
        : res.status(401).json({ error: 'Invalid PIN' });
    }

    const now = new Date().toISOString();
    device.status = 'active';
    device.lastSeen = now;
    device.linkedAt = now;
    // El código ya cumplió su función: no puede usarse para vincular otro celular.
    consumeLinkCode(device);

    createDeviceAlert({
      responsibleId,
      deviceId: device.id,
      alertType: 'DEVICE_LINKED',
      message: `Dispositivo protegido "${device.deviceName}" vinculado exitosamente.`
    });

    return res.status(200).json({
      message: 'Vinculación confirmada',
      device: toPublicDevice(device)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/devices
 * Lista los dispositivos vinculados del responsable autenticado.
 */
export const getDevices = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const devices = db.devices
      .filter(d => d.responsibleId === responsibleId)
      .map(toPublicDevice);
    return res.status(200).json({ devices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * PATCH /api/devices/:id/status
 * Activa o desactiva la protección del dispositivo.
 *
 * Con "pending" lo desvincula (es lo que hace unlinkDevice en la app): revoca la
 * credencial del celular y genera un código nuevo para volver a vincularlo.
 */
export const updateDeviceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = normalizeDeviceStatus(status);
    if (!normalizedStatus) {
      return res.status(400).json({ error: 'Invalid status. Must be active or inactive' });
    }

    const device = db.devices.find(d => d.id === id && d.responsibleId === responsibleId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found or unauthorized' });
    }

    if (normalizedStatus === 'pending') {
      resetDeviceLink(device);
    } else {
      if (isAwaitingRelink(device)) {
        return res.status(409).json({
          error:
            'Este celular se desvinculó. Para volver a protegerlo, vinculalo con el código nuevo.'
        });
      }
      if (device.status === 'pending') {
        // Se activa sin pasar por la vinculación: el código pendiente deja de servir.
        device.linkedAt = new Date().toISOString();
        consumeLinkCode(device);
      }
      device.status = normalizedStatus as DeviceStatus;
      device.lastSeen = new Date().toISOString();
    }

    return res.status(200).json({
      message: 'Device status updated successfully',
      device: toPublicDevice(device)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/devices/:id/link-code
 * Genera un código de vinculación nuevo, con vigencia completa.
 *
 * Si el celular ya está vinculado (activo o pausado), generar un código
 * equivale a desvincularlo: exige el PIN del adulto, revoca la credencial del
 * celular y el dispositivo vuelve a "pending".
 */
export const regenerateLinkCode = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId!;
    const { id } = req.params;
    const { pin } = (req.body ?? {}) as { pin?: unknown };

    const device = db.devices.find(d => d.id === id && d.responsibleId === responsibleId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found or unauthorized' });
    }

    if (device.status === 'pending') {
      issueLinkCode(device);
    } else {
      if (!isValidPin(pin)) {
        return res.status(400).json({
          error: `Ingresá tu PIN de seguridad de ${PIN_LENGTH} dígitos para desvincular este celular`
        });
      }

      const responsible = db.responsables.find(r => r.id === responsibleId);
      if (!responsible) {
        return res.status(404).json({ error: 'Responsible not found' });
      }
      if (!responsible.pinHash) {
        return res.status(409).json({
          error: 'El responsable todavía no configuró un PIN de seguridad'
        });
      }

      keepStateOnError(res);
      const check = await checkResponsiblePin(responsible, pin);
      if (!check.ok) {
        return check.lockedMinutes > 0
          ? res.status(429).json({ error: pinLockedMessage(check.lockedMinutes) })
          : res.status(401).json({ error: 'Invalid PIN' });
      }

      resetDeviceLink(device);
    }

    return res.status(200).json({
      message: 'Código de vinculación generado',
      linkCode: device.linkCode,
      linkCodeExpiresAt: device.linkCodeExpiresAt,
      device: toPublicDevice(device)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/devices/push-token
 * Registra o actualiza el pushToken del responsable autenticado para
 * recibir notificaciones push de alertas críticas.
 */
export const registerPushToken = async (req: AuthRequest, res: Response) => {
  try {
    const { pushToken } = req.body as { pushToken?: unknown };

    if (!pushToken || typeof pushToken !== 'string') {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    const responsible = db.responsables.find(r => r.id === req.responsibleId);
    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    setResponsiblePushToken(responsible, pushToken);

    return res.status(201).json({
      message: 'Push token registered successfully'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
