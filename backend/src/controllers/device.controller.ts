import { Response } from 'express';
import { db, DeviceStatus } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  buildPendingDevice,
  createDeviceAlert,
  findResponsibleDevice,
  normalizeDeviceStatus,
  verifyResponsiblePin
} from '../services/device.service';

const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/devices/link
 * El adulto responsable registra el dispositivo del menor (nombre y fecha de
 * nacimiento). El dispositivo queda en estado "pending" con un linkCode que la
 * app del dispositivo protegido usa para identificar el perfil.
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
      device: newDevice,
      deviceId: newDevice.id,
      linkCode: newDevice.linkCode
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

    const isValid = await verifyResponsiblePin(responsible, pin);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    device.status = 'active';
    device.lastSeen = new Date().toISOString();

    createDeviceAlert({
      responsibleId,
      deviceId: device.id,
      alertType: 'DEVICE_LINKED',
      message: `Dispositivo protegido "${device.deviceName}" vinculado exitosamente.`
    });

    return res.status(200).json({
      message: 'Vinculación confirmada',
      device
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
    const devices = db.devices.filter(d => d.responsibleId === responsibleId);
    return res.status(200).json({ devices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * PATCH /api/devices/:id/status
 * Activa o desactiva la protección del dispositivo.
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

    device.status = normalizedStatus as DeviceStatus;
    device.lastSeen = new Date().toISOString();

    return res.status(200).json({
      message: 'Device status updated successfully',
      device
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
