import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, Device, DeviceStatus, Responsible } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { setResponsiblePushToken } from '../services/push.service';

const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

    // Generar linkCode único (8 caracteres alfanuméricos, sin ambiguos)
    const LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let linkCode = '';
    do {
      linkCode = Array.from(
        { length: 8 },
        () => LINK_CODE_ALPHABET[Math.floor(Math.random() * LINK_CODE_ALPHABET.length)]
      ).join('');
    } while (db.devices.some(d => d.linkCode === linkCode));

    const now = new Date().toISOString();

    const newDevice: Device = {
      id: uuidv4(),
      responsibleId,
      deviceName: cleanName,
      fechaNacimiento,
      linkCode,
      deviceToken: typeof deviceToken === 'string' ? deviceToken : undefined,
      status: 'pending',
      lastSeen: now,
      createdAt: now
    };

    db.devices.push(newDevice);

    // Alerta de auditoría: dispositivo pendiente de vinculación
    db.alerts.push({
      id: uuidv4(),
      responsibleId,
      deviceId: newDevice.id,
      alertType: 'DEVICE_PENDING',
      message: `Dispositivo protegido "${cleanName}" creado. Pendiente de vincular con el PIN de seguridad.`,
      read: false,
      createdAt: now
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

export const getDevices = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const devices = db.devices.filter(d => d.responsibleId === responsibleId);
    return res.status(200).json({ devices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateDeviceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, inactive or pending' });
    }

    const device = db.devices.find(d => d.id === id && d.responsibleId === responsibleId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found or unauthorized' });
    }

    device.status = status as DeviceStatus;
    device.lastSeen = new Date().toISOString();

    return res.status(200).json({
      message: 'Device status updated successfully',
      device
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
    const responsibleId = req.responsibleId;
    const { pushToken } = req.body as { pushToken?: string };

    if (!pushToken || typeof pushToken !== 'string') {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    const responsible = db.responsables.find(r => r.id === responsibleId) as Responsible;
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
