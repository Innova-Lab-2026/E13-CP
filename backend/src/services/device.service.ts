import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db, Device, DeviceStatus, PublicDevice, Responsible } from '../config/db';

export const PIN_LENGTH = 4;
const PIN_REGEX = /^\d{4}$/;
const LINK_CODE_LENGTH = 8;
const LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Mismo alfabeto que LINK_CODE_ALPHABET: sin I, O, 0 ni 1. */
const LINK_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;

/** Vigencia del código de vinculación si no se configura LINK_CODE_TTL_MINUTES (24 h). */
export const DEFAULT_LINK_CODE_TTL_MINUTES = 1440;
/** PIN incorrectos seguidos con un mismo código antes de invalidarlo. */
export const LINK_CODE_MAX_ATTEMPTS = 5;

/**
 * Valida el formato del PIN de seguridad.
 * Debe tener exactamente 4 dígitos numéricos.
 */
export const isValidPin = (pin: unknown): pin is string =>
  typeof pin === 'string' && PIN_REGEX.test(pin);

/**
 * Genera un código de vinculación alfanumérico único.
 * Se excluyen caracteres ambiguos (I, O, 0, 1) para facilitar la tipeada.
 * Usa crypto.randomInt: el código sirve para vincular, no puede ser predecible.
 */
export const generateLinkCode = (): string => {
  let code = '';

  do {
    code = Array.from(
      { length: LINK_CODE_LENGTH },
      () => LINK_CODE_ALPHABET[crypto.randomInt(LINK_CODE_ALPHABET.length)]
    ).join('');
  } while (db.devices.some(device => device.linkCode === code));

  return code;
};

/**
 * Minutos de vigencia del código. Se lee en cada uso para respetar el .env
 * (LINK_CODE_TTL_MINUTES); un valor inválido vuelve al default de 24 h.
 */
export const linkCodeTtlMinutes = (): number => {
  const parsed = Number.parseInt(process.env.LINK_CODE_TTL_MINUTES ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LINK_CODE_TTL_MINUTES;
};

/**
 * Normaliza el código tal como lo tipea la persona: mayúsculas y sin espacios
 * ni guiones. Devuelve null si no tiene el formato de un código.
 */
export const normalizeLinkCode = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  return LINK_CODE_REGEX.test(code) ? code : null;
};

/** Asigna un código nuevo con vigencia completa y reinicia sus intentos. */
export const issueLinkCode = (device: Device, now = Date.now()): void => {
  device.linkCode = generateLinkCode();
  device.linkCodeExpiresAt = new Date(now + linkCodeTtlMinutes() * 60000).toISOString();
  device.linkCodeUsedAt = undefined;
  device.linkFailedAttempts = undefined;
};

/**
 * Un código sirve si el dispositivo está pendiente, no se usó y no venció.
 * Los dispositivos creados antes del vencimiento no tienen fecha: se toman
 * como vencidos y el adulto genera uno nuevo desde la app.
 */
export const isLinkCodeActive = (device: Device, now = Date.now()): boolean => {
  if (device.status !== 'pending' || device.linkCodeUsedAt) return false;
  const expiresAt = device.linkCodeExpiresAt ? Date.parse(device.linkCodeExpiresAt) : NaN;
  return !Number.isNaN(expiresAt) && expiresAt > now;
};

/** Marca el código como usado (o invalidado): no se puede volver a usar. */
export const consumeLinkCode = (device: Device): void => {
  device.linkCodeUsedAt = new Date().toISOString();
  device.linkFailedAttempts = undefined;
};

/** Hash SHA-256 (hex) de la credencial del celular: es lo único que se guarda. */
export const hashDeviceSecret = (secret: string): string =>
  crypto.createHash('sha256').update(secret).digest('hex');

/**
 * Emite una credencial opaca nueva para el celular (32 bytes en base64url) y
 * guarda solo su hash. Devuelve el secreto para entregarlo una única vez.
 */
export const issueDeviceSecret = (device: Device): string => {
  const secret = crypto.randomBytes(32).toString('base64url');
  device.deviceSecretHash = hashDeviceSecret(secret);
  device.deviceSecretIssuedAt = new Date().toISOString();
  return secret;
};

/** Revoca la credencial del celular: el próximo pedido con ella responde 401. */
export const revokeDeviceSecret = (device: Device): void => {
  device.deviceSecretHash = undefined;
  device.deviceSecretIssuedAt = undefined;
};

/**
 * Desvincula el celular: revoca la credencial, vuelve a "pending" y genera un
 * código nuevo para poder vincularlo otra vez.
 */
export const resetDeviceLink = (device: Device): void => {
  revokeDeviceSecret(device);
  device.status = 'pending';
  device.linkedAt = undefined;
  device.lastSeen = new Date().toISOString();
  device.unlinkedAt = device.lastSeen;
  issueLinkCode(device);
};

/**
 * true si el dispositivo se desvinculó y espera que lo vinculen con su código
 * nuevo. Un celular vinculado de la forma anterior (con la sesión del adulto)
 * no se entera de la desvinculación y, al reactivar la protección, mandaría
 * PATCH /:id/status: eso no puede pisar el código nuevo sin aviso.
 */
export const isAwaitingRelink = (device: Device): boolean =>
  !!device.unlinkedAt && isLinkCodeActive(device);

/**
 * Busca el dispositivo dueño de una credencial. Compara los hashes con
 * timingSafeEqual para no filtrar por tiempo cuánto coincidió.
 */
export const findDeviceBySecret = (secret: string): Device | undefined => {
  if (!secret) return undefined;
  const candidate = Buffer.from(hashDeviceSecret(secret), 'hex');
  return db.devices.find(device => {
    if (!device.deviceSecretHash) return false;
    const stored = Buffer.from(device.deviceSecretHash, 'hex');
    return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
  });
};

/**
 * Forma pública del dispositivo para las respuestas de la API. Nunca expone la
 * credencial, los intentos ni el deviceToken; el código solo mientras sirve.
 */
export const toPublicDevice = (device: Device): PublicDevice => {
  const publicDevice: PublicDevice = {
    id: device.id,
    responsibleId: device.responsibleId,
    deviceName: device.deviceName,
    fechaNacimiento: device.fechaNacimiento,
    status: device.status,
    lastSeen: device.lastSeen,
    createdAt: device.createdAt
  };
  if (device.linkedAt) {
    publicDevice.linkedAt = device.linkedAt;
  }
  if (isLinkCodeActive(device)) {
    publicDevice.linkCode = device.linkCode;
    publicDevice.linkCodeExpiresAt = device.linkCodeExpiresAt;
  }
  return publicDevice;
};

/** Intentos fallidos seguidos con el PIN antes de bloquearlo. */
export const PIN_MAX_ATTEMPTS = 5;
/** Minutos que el PIN queda bloqueado después de agotar los intentos. */
export const PIN_LOCK_MINUTES = 15;

/** Cifra el PIN con bcrypt y lo asocia al responsable. */
export const setResponsiblePin = async (
  responsible: Responsible,
  pin: string
): Promise<void> => {
  const salt = await bcrypt.genSalt(10);
  responsible.pinHash = await bcrypt.hash(pin, salt);
  responsible.pinUpdatedAt = new Date().toISOString();
  responsible.pinFailedAttempts = undefined;
  responsible.pinLockedUntil = undefined;
};

/**
 * Minutos que faltan para que se desbloquee el PIN (redondeado hacia arriba),
 * o 0 si no está bloqueado.
 */
export const pinLockRemainingMinutes = (responsible: Responsible, now = Date.now()): number => {
  const lockedUntil = responsible.pinLockedUntil ? Date.parse(responsible.pinLockedUntil) : NaN;
  if (Number.isNaN(lockedUntil) || lockedUntil <= now) {
    return 0;
  }
  return Math.ceil((lockedUntil - now) / 60000);
};

/** Mensaje del 429 que responden los endpoints que piden el PIN mientras está bloqueado. */
export const pinLockedMessage = (minutes: number): string =>
  `Ingresaste mal el PIN demasiadas veces. Probá de nuevo en ${minutes} ${
    minutes === 1 ? 'minuto' : 'minutos'
  }.`;

/**
 * Verifica el PIN contra el hash del responsable.
 *
 * Cuenta los intentos fallidos: al llegar a PIN_MAX_ATTEMPTS el PIN queda
 * bloqueado PIN_LOCK_MINUTES y, mientras tanto, devuelve false sin compararlo.
 * Así no se pueden probar las 10.000 combinaciones con una sesión robada.
 * Quien la llama revisa antes pinLockRemainingMinutes para responder 429, y
 * marca el pedido con keepStateOnError para que el contador se guarde.
 *
 * El intento se cuenta ANTES de esperar a bcrypt y se descuenta si el PIN es
 * correcto. Si se contara después, varios pedidos en paralelo pasarían todos el
 * control del bloqueo y se compararían todos los PIN (más de 5 por ventana).
 */
export const verifyResponsiblePin = async (
  responsible: Responsible,
  pin: string
): Promise<boolean> => {
  const pinHash = responsible.pinHash;
  if (!pinHash || pinLockRemainingMinutes(responsible) > 0) {
    return false;
  }

  // Reserva sincrónica del intento: los pedidos que lleguen mientras se compara
  // ya lo ven contado (y bloqueado, si este era el quinto).
  const attempts = (responsible.pinFailedAttempts ?? 0) + 1;
  let lockedHere: string | undefined;
  if (attempts >= PIN_MAX_ATTEMPTS) {
    lockedHere = new Date(Date.now() + PIN_LOCK_MINUTES * 60000).toISOString();
    responsible.pinFailedAttempts = undefined;
    responsible.pinLockedUntil = lockedHere;
  } else {
    responsible.pinFailedAttempts = attempts;
  }

  const isValid = await bcrypt.compare(pin, pinHash);
  if (!isValid) {
    return false;
  }

  // PIN correcto: se descuenta el intento. Solo se levanta el bloqueo que puso
  // este mismo pedido; uno puesto por pedidos en paralelo se respeta.
  if (lockedHere !== undefined) {
    if (responsible.pinLockedUntil === lockedHere) {
      responsible.pinLockedUntil = undefined;
    }
  } else if (pinLockRemainingMinutes(responsible) > 0) {
    return true;
  }
  responsible.pinFailedAttempts = undefined;
  return true;
};

export type PinCheck = { ok: true } | { ok: false; lockedMinutes: number };

/**
 * Verifica el PIN e informa si quedó bloqueado: `lockedMinutes > 0` se responde
 * con 429 y `0` con 401 (PIN incorrecto).
 */
export const checkResponsiblePin = async (
  responsible: Responsible,
  pin: string
): Promise<PinCheck> => {
  const lockedBefore = pinLockRemainingMinutes(responsible);
  if (lockedBefore > 0) {
    return { ok: false, lockedMinutes: lockedBefore };
  }

  if (await verifyResponsiblePin(responsible, pin)) {
    return { ok: true };
  }

  return { ok: false, lockedMinutes: pinLockRemainingMinutes(responsible) };
};

/** Normaliza un estado recibido a los valores canónicos del dominio. */
export const normalizeDeviceStatus = (status: unknown): DeviceStatus | null => {
  if (typeof status !== 'string') {
    return null;
  }

  switch (status.toLowerCase()) {
    case 'active':
    case 'activo':
      return 'active';
    case 'inactive':
    case 'disabled':
    case 'inactivo':
      return 'inactive';
    case 'pending':
    case 'pendiente':
      return 'pending';
    default:
      return null;
  }
};

/**
 * Construye un dispositivo protegido en estado `pending`, con un código de
 * vinculación vigente. El vínculo se confirma luego con POST /api/devices/claim
 * (desde el celular del menor) o POST /api/devices/confirm-link (con la sesión del adulto).
 */
export const buildPendingDevice = (params: {
  responsibleId: string;
  deviceName: string;
  fechaNacimiento: string;
  deviceToken?: string;
}): Device => {
  const now = new Date().toISOString();

  const device: Device = {
    id: uuidv4(),
    responsibleId: params.responsibleId,
    deviceName: params.deviceName,
    fechaNacimiento: params.fechaNacimiento,
    linkCode: '',
    deviceToken: params.deviceToken,
    status: 'pending',
    lastSeen: now,
    createdAt: now
  };
  issueLinkCode(device);
  return device;
};

/**
 * Busca un dispositivo del responsable por id o por código de vinculación.
 * `includeInactive` permite encontrar también los desactivados.
 */
export const findResponsibleDevice = (
  responsibleId: string,
  criteria: { deviceId?: string; linkCode?: string }
): Device | undefined => {
  if (criteria.deviceId) {
    return db.devices.find(
      device => device.id === criteria.deviceId && device.responsibleId === responsibleId
    );
  }

  if (!criteria.linkCode) {
    return undefined;
  }

  const linkCode = criteria.linkCode;

  return db.devices.find(
    device =>
      device.linkCode === linkCode.toUpperCase() &&
      device.responsibleId === responsibleId
  );
};

/** Genera una alerta para el responsable y la deja sin leer. */
export const createDeviceAlert = (params: {
  responsibleId: string;
  deviceId: string;
  alertType: string;
  message: string;
}): void => {
  db.alerts.push({
    id: uuidv4(),
    responsibleId: params.responsibleId,
    deviceId: params.deviceId,
    alertType: params.alertType,
    message: params.message,
    read: false,
    createdAt: new Date().toISOString()
  });
};
