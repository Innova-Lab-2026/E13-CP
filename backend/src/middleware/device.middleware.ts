import { Request, Response, NextFunction } from 'express';
import { db, Device } from '../config/db';
import { findDeviceBySecret } from '../services/device.service';
import { parseAuthorization } from './auth.middleware';

export interface DeviceRequest extends Request {
  /** Dispositivo dueño de la credencial. */
  deviceId?: string;
  /** Adulto responsable del dispositivo (no viene del cliente: sale de la base). */
  responsibleId?: string;
}

export const DEVICE_UNLINKED_MESSAGE = 'Este celular ya no está vinculado';

/**
 * Busca el dispositivo de un header "Authorization: Device <secreto>". Solo
 * sirven las credenciales de dispositivos vinculados (activos o pausados) cuyo
 * responsable sigue existiendo.
 */
export const deviceFromAuthorization = (header: unknown): Device | undefined => {
  const parsed = parseAuthorization(header);
  if (!parsed || parsed.scheme !== 'device') return undefined;

  const device = findDeviceBySecret(parsed.credential);
  if (!device || (device.status !== 'active' && device.status !== 'inactive')) {
    return undefined;
  }
  return db.responsables.some(r => r.id === device.responsibleId) ? device : undefined;
};

/**
 * Exige la credencial del celular vinculado por código ("Device <secreto>") e
 * inyecta deviceId y responsibleId en `req`. El JWT del adulto ("Bearer") no
 * sirve acá. Si la credencial no corresponde a un dispositivo vinculado, 401:
 * la app borra la sesión del celular y muestra que se desvinculó.
 */
export const authenticateDevice = (req: DeviceRequest, res: Response, next: NextFunction) => {
  const device = deviceFromAuthorization(req.headers['authorization']);
  if (!device) {
    return res.status(401).json({ error: DEVICE_UNLINKED_MESSAGE, code: 'DEVICE_UNLINKED' });
  }

  req.deviceId = device.id;
  req.responsibleId = device.responsibleId;
  next();
};
