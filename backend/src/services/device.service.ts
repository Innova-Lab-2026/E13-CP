import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, Device, DeviceStatus, Responsible } from '../config/db';

export const PIN_LENGTH = 4;
const PIN_REGEX = /^\d{4}$/;
const LINK_CODE_LENGTH = 8;
const LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Valida el formato del PIN de seguridad.
 * Debe tener exactamente 4 dígitos numéricos.
 */
export const isValidPin = (pin: unknown): pin is string =>
  typeof pin === 'string' && PIN_REGEX.test(pin);

/**
 * Genera un código de vinculación alfanumérico único.
 * Se excluyen caracteres ambiguos (I, O, 0, 1) para facilitar la tipeada.
 */
export const generateLinkCode = (): string => {
  let code = '';

  do {
    code = Array.from(
      { length: LINK_CODE_LENGTH },
      () => LINK_CODE_ALPHABET[Math.floor(Math.random() * LINK_CODE_ALPHABET.length)]
    ).join('');
  } while (db.devices.some(device => device.linkCode === code));

  return code;
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
 */
export const verifyResponsiblePin = async (
  responsible: Responsible,
  pin: string
): Promise<boolean> => {
  if (!responsible.pinHash || pinLockRemainingMinutes(responsible) > 0) {
    return false;
  }

  const isValid = await bcrypt.compare(pin, responsible.pinHash);

  if (isValid) {
    responsible.pinFailedAttempts = undefined;
    responsible.pinLockedUntil = undefined;
    return true;
  }

  const attempts = (responsible.pinFailedAttempts ?? 0) + 1;
  if (attempts >= PIN_MAX_ATTEMPTS) {
    responsible.pinFailedAttempts = undefined;
    responsible.pinLockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60000).toISOString();
  } else {
    responsible.pinFailedAttempts = attempts;
  }

  return false;
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
 * Construye un dispositivo protegido en estado `pending`.
 * El vínculo se confirma luego mediante POST /api/devices/confirm-link.
 */
export const buildPendingDevice = (params: {
  responsibleId: string;
  deviceName: string;
  fechaNacimiento: string;
  deviceToken?: string;
}): Device => {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    responsibleId: params.responsibleId,
    deviceName: params.deviceName,
    fechaNacimiento: params.fechaNacimiento,
    linkCode: generateLinkCode(),
    deviceToken: params.deviceToken,
    status: 'pending',
    lastSeen: now,
    createdAt: now
  };
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
