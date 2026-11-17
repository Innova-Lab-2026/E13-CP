import { db, Responsible } from '../config/db';

/**
 * Tipo de mensaje de push notification.
 */
export interface PushNotification {
  /** Título de la notificación. */
  title: string;
  /** Cuerpo del mensaje. */
  body: string;
  /** Token de dispositivo a notificar (opcional, se pasa por separado al enviar). */
  pushToken?: string;
}

/**
 * Variable de entorno que habilita/deshabilita el envío real de push.
 * Si no está configurada, el servicio opera en modo mock (solo logs).
 */
const PUSH_SERVICE_ENABLED = process.env.PUSH_SERVICE_ENABLED === 'true';

/**
 * Envía una push notification al dispositivo del responsable.
 *
 * Implementación MVP: mock que registra el intento en consola y devuelve
 * éxito simulado. Si PUSH_SERVICE_ENABLED no es 'true', nunca falla el
 * flujo de eventos aunque el envío de push falle (graceful degradation).
 *
 * Cuando se integre con un servicio real (Firebase FCM, Expo, etc.),
 * reemplazar el cuerpo de esta función por la llamada al SDK correspondiente.
 */
export const sendPushNotification = (
  pushToken: string,
  notification: PushNotification
): { sent: boolean; messageId?: string; error?: string } => {
  console.log(`[PUSH MOCK] Enviando notificación a ${pushToken}:`, notification);

  if (!PUSH_SERVICE_ENABLED) {
    return {
      sent: true,
      messageId: `mock-${Date.now()}`,
      error: undefined
    };
  }

  try {
    // Aquí iría la integración real con el servicio de push (FCM, Expo, etc.)
    // Ejemplo conceptual:
    // const response = await fetch('https://fcm.googleapis.com/fcm/send', {...});
    return {
      sent: true,
      messageId: `push-${Date.now()}`,
      error: undefined
    };
  } catch (error: any) {
    return {
      sent: false,
      messageId: undefined,
      error: error.message || 'Push service error'
    };
  }
};

/**
 * Obtiene el pushToken de un responsable.
 * Devuelve undefined si el responsable no tiene pushToken registrado.
 */
export const getResponsiblePushToken = (responsibleId: string): string | undefined => {
  const responsible = db.responsables.find(r => r.id === responsibleId);
  return responsible?.pushToken;
};

/**
 * Registra o actualiza el pushToken de un responsable.
 */
export const setResponsiblePushToken = (
  responsible: Responsible,
  pushToken: string
): void => {
  responsible.pushToken = pushToken;
};

/**
 * Categorías de evento que generan alertas críticas y notificación push.
 */
export const CRITICAL_EVENT_TYPES = [
  'SITE_BLOCKED',
  'UNINSTALL_ATTEMPT'
] as const;

export type CriticalEventType = typeof CRITICAL_EVENT_TYPES[number];

/**
 * Genera el título y cuerpo del mensaje de push para un tipo de alerta crítica.
 */
export const getCriticalAlertMessage = (
  eventType: string,
  deviceName: string,
  domain?: string
): PushNotification => {
  switch (eventType) {
    case 'UNINSTALL_ATTEMPT':
      return {
        title: '¡Requiere tu atención!',
        body: `Desinstalación detectada en el dispositivo "${deviceName}".`
      };
    case 'SITE_BLOCKED':
      return {
        title: 'Alerta crítica: intento de acceso bloqueado',
        body: `Se bloqueó el acceso a ${domain || 'un sitio restringido'} desde el dispositivo "${deviceName}".`
      };
    default:
      return {
        title: 'Alerta de seguridad',
        body: `Evento de seguridad detectado en el dispositivo "${deviceName}".`
      };
  }
};
