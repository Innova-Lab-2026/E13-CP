import { v4 as uuidv4 } from 'uuid';
import { db, Device, EventItem, AlertItem } from '../config/db';
import {
  sendPushNotification,
  getResponsiblePushToken,
  CRITICAL_EVENT_TYPES,
  getCriticalAlertMessage,
  CriticalEventType
} from './push.service';

export const SECURITY_EVENT_TYPES = [
  'SITE_BLOCKED',
  'UNINSTALL_ATTEMPT',
  'APP_INSTALL_ATTEMPT',
  'BYPASS_ATTEMPT',
  'ACCESS_ATTEMPT',
  'PROTECTION_MODIFIED'
] as const;

export type SecurityEventType = typeof SECURITY_EVENT_TYPES[number];

export const isSecurityEventType = (value: unknown): value is SecurityEventType =>
  typeof value === 'string' && SECURITY_EVENT_TYPES.includes(value as SecurityEventType);

/**
 * Eventos que generan una alerta para el adulto. Además de los críticos
 * (que también envían push) se mantienen ACCESS_ATTEMPT, el nombre anterior de
 * SITE_BLOCKED que siguen enviando los APK ya instalados, y los intentos de
 * evasión o de instalación.
 */
const ALERT_EVENT_TYPES: readonly SecurityEventType[] = [
  ...CRITICAL_EVENT_TYPES,
  'ACCESS_ATTEMPT',
  'APP_INSTALL_ATTEMPT',
  'BYPASS_ATTEMPT'
];

const alertMessageFor = (eventType: SecurityEventType, deviceName: string, domain?: string) => {
  switch (eventType) {
    case 'SITE_BLOCKED':
    case 'ACCESS_ATTEMPT':
      return `Intento de acceso bloqueado al sitio ${domain || 'restringido'} desde el dispositivo ${deviceName}.`;
    case 'UNINSTALL_ATTEMPT':
      return `¡Alerta de seguridad! Intento de desinstalación detectado en el dispositivo ${deviceName}.`;
    case 'APP_INSTALL_ATTEMPT':
      return `Intento de instalación de aplicación no autorizada detectado en el dispositivo ${deviceName}.`;
    case 'BYPASS_ATTEMPT':
      return `¡Alerta de seguridad! Intento de evasión o bypass detectado en el dispositivo ${deviceName}.`;
    default:
      return `Evento de seguridad detectado en el dispositivo ${deviceName}.`;
  }
};

/**
 * Registra un evento de seguridad del dispositivo. Los de seguridad generan una
 * alerta para el adulto y los críticos además envían push (si falla, no corta).
 *
 * La comparten POST /api/events (legado, público) y POST /api/devices/me/events
 * (con la credencial del celular): quien la llama ya validó el tipo y el dispositivo.
 */
export const recordDeviceEvent = (params: {
  device: Device;
  eventType: SecurityEventType;
  domain?: string;
  details: string;
}): EventItem => {
  const { device, eventType, domain, details } = params;

  const newEvent: EventItem = {
    id: uuidv4(),
    deviceId: device.id,
    eventType,
    domain,
    details,
    timestamp: new Date().toISOString()
  };

  db.events.push(newEvent);

  if (ALERT_EVENT_TYPES.includes(eventType)) {
    const newAlert: AlertItem = {
      id: uuidv4(),
      responsibleId: device.responsibleId,
      deviceId: device.id,
      alertType: eventType,
      message: alertMessageFor(eventType, device.deviceName, domain),
      read: false,
      createdAt: new Date().toISOString()
    };

    db.alerts.push(newAlert);
  }

  const criticalEventType = eventType as CriticalEventType;
  if (CRITICAL_EVENT_TYPES.includes(criticalEventType)) {
    // Enviar push notification (graceful: no romper si falla)
    const pushToken = getResponsiblePushToken(device.responsibleId);
    if (pushToken) {
      const notification = getCriticalAlertMessage(criticalEventType, device.deviceName, domain);
      sendPushNotification(pushToken, notification);
    }
  }

  return newEvent;
};
