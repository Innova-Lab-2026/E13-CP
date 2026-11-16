import crypto from 'crypto';
import { db } from '../config/db';

/** Intentos fallidos de vinculación por código permitidos por IP en la ventana. */
export const CLAIM_MAX_FAILURES = 10;
/** Duración de la ventana de intentos, en minutos. */
export const CLAIM_WINDOW_MINUTES = 15;

const windowMs = () => CLAIM_WINDOW_MINUTES * 60000;

/** La IP no se guarda: solo su hash, que alcanza para contar intentos. */
export const claimThrottleKey = (ip: string | undefined): string =>
  crypto.createHash('sha256').update(ip || 'desconocida').digest('hex');

/** Borra las ventanas vencidas para que el registro no crezca sin límite. */
const pruneExpired = (now: number): void => {
  for (const [key, entry] of Object.entries(db.claimThrottle)) {
    if (Date.parse(entry.firstAt) + windowMs() <= now) {
      delete db.claimThrottle[key];
    }
  }
};

/** true si la IP ya agotó los intentos de la ventana vigente. */
export const isClaimThrottled = (key: string, now = Date.now()): boolean => {
  pruneExpired(now);
  const entry = db.claimThrottle[key];
  return !!entry && entry.count >= CLAIM_MAX_FAILURES;
};

/**
 * Suma un intento fallido; la ventana empieza con el primero.
 *
 * claimDevice lo llama ANTES de verificar el PIN (reserva el intento) y lo
 * descuenta con releaseClaimFailure si la vinculación sale bien. Así los
 * pedidos en paralelo no pasan todos el límite mientras se compara el PIN.
 */
export const registerClaimFailure = (key: string, now = Date.now()): void => {
  const entry = db.claimThrottle[key];
  if (!entry || Date.parse(entry.firstAt) + windowMs() <= now) {
    db.claimThrottle[key] = { count: 1, firstAt: new Date(now).toISOString() };
    return;
  }
  entry.count += 1;
};

/** Descuenta un intento reservado con registerClaimFailure que terminó bien. */
export const releaseClaimFailure = (key: string): void => {
  const entry = db.claimThrottle[key];
  if (!entry) return;
  entry.count -= 1;
  if (entry.count <= 0) {
    delete db.claimThrottle[key];
  }
};
