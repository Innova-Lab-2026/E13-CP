import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, EventItem, AlertItem } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendPushNotification,
  getResponsiblePushToken,
  CRITICAL_EVENT_TYPES,
  getCriticalAlertMessage,
  CriticalEventType
} from '../services/push.service';

const SECURITY_EVENT_TYPES = [
  'SITE_BLOCKED',
  'UNINSTALL_ATTEMPT',
  'APP_INSTALL_ATTEMPT',
  'BYPASS_ATTEMPT',
  'ACCESS_ATTEMPT'
] as const;

export type SecurityEventType = typeof SECURITY_EVENT_TYPES[number];

export const recordEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId, eventType, domain, details } = req.body;

    if (!deviceId || !eventType || !details) {
      return res.status(400).json({ error: 'deviceId, eventType, and details are required' });
    }

    if (!SECURITY_EVENT_TYPES.includes(eventType as SecurityEventType)) {
      return res.status(400).json({ error: 'Invalid eventType' });
    }

    const device = db.devices.find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const newEvent: EventItem = {
      id: uuidv4(),
      deviceId,
      eventType: eventType as SecurityEventType,
      domain,
      details,
      timestamp: new Date().toISOString()
    };

    db.events.push(newEvent);

    // Si es un evento de seguridad crítica, generar alerta y enviar push notification
    const criticalEventType = eventType as CriticalEventType;
    if (CRITICAL_EVENT_TYPES.includes(criticalEventType)) {
      const alertMessage = eventType === 'SITE_BLOCKED'
        ? `Intento de acceso bloqueado al sitio ${domain || 'restringido'} desde el dispositivo ${device.deviceName}.`
        : eventType === 'UNINSTALL_ATTEMPT'
        ? `¡Alerta de seguridad! Intento de desinstalación detectado en el dispositivo ${device.deviceName}.`
        : `Evento de seguridad detectado en el dispositivo ${device.deviceName}.`;

      const newAlert: AlertItem = {
        id: uuidv4(),
        responsibleId: device.responsibleId,
        deviceId: device.id,
        alertType: eventType,
        message: alertMessage,
        read: false,
        createdAt: new Date().toISOString()
      };

      db.alerts.push(newAlert);

      // Enviar push notification (graceful: no romper si falla)
      const pushToken = getResponsiblePushToken(device.responsibleId);
      if (pushToken) {
        const notification = getCriticalAlertMessage(
          criticalEventType,
          device.deviceName,
          domain
        );
        sendPushNotification(pushToken, notification);
      }
    }

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
