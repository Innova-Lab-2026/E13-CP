import { Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { isSecurityEventType, recordDeviceEvent } from '../services/event.service';

export type { SecurityEventType } from '../services/event.service';

/**
 * POST /api/events (público, legado)
 * Se mantiene por compatibilidad con los APK ya instalados, que mandan el
 * deviceId en el cuerpo. Los celulares vinculados por código usan
 * POST /api/devices/me/events, que toma el dispositivo de la credencial.
 */
export const recordEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId, eventType, domain, details } = req.body;

    if (!deviceId || !eventType || !details) {
      return res.status(400).json({ error: 'deviceId, eventType, and details are required' });
    }

    if (!isSecurityEventType(eventType)) {
      return res.status(400).json({ error: 'Invalid eventType' });
    }

    const device = db.devices.find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const newEvent = recordDeviceEvent({ device, eventType, domain, details });

    return res.status(201).json({
      message: 'Event recorded successfully',
      event: newEvent
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { deviceId, category } = req.query;

    const responsibleDevices = db.devices.filter(d => d.responsibleId === responsibleId);
    const deviceIds = responsibleDevices.map(d => d.id);

    let events = db.events
      .filter(e => deviceIds.includes(e.deviceId))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // descendente por timestamp

    if (deviceId) {
      events = events.filter(e => e.deviceId === deviceId);
    }

    if (category) {
      events = events.filter(e => e.eventType === category);
    }

    return res.status(200).json({ events });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const alerts = db.alerts.filter(a => a.responsibleId === responsibleId);
    return res.status(200).json({ alerts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const markAlertRead = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { id } = req.params;

    const alert = db.alerts.find(a => a.id === id && a.responsibleId === responsibleId);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found or unauthorized' });
    }

    alert.read = true;

    return res.status(200).json({
      message: 'Alert marked as read',
      alert
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
