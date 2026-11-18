import type { HistoryVariant } from "../components/historial/historyLook";
import { EVENT_SHORT_DETAIL, shortDetails } from "../components/historial/historyFormat";
import { apiRequest } from "./api";
import { getDevices } from "./deviceService";
import type { SecurityEventType } from "./blocklistService";
import { formatDayLabel, formatTime } from "../utils/date";

export type HistoryCategory = "blocked" | "security" | "settings";

export interface HistoryEvent {
  id: string;
  variant: HistoryVariant;
  title: string;
  /** Detalle corto para la tarjeta: el sitio o lo que pasó ("Se pausó la protección"). */
  description: string;
  time: string;
  device: string;
  deviceId: string;
  category: HistoryCategory;
  /** "Hoy", "Ayer" o dd/mm/aaaa. */
  date: string;
  timestamp: string;
  domain?: string;
  /** Tipo de origen: el `eventType` del evento o el `alertType` de la vinculación. */
  eventType?: string;
  /** Texto completo que registró el celular o el servidor. */
  details?: string;
}

type ApiEvent = {
  id: string;
  deviceId: string;
  eventType: SecurityEventType;
  domain?: string;
  details: string;
  timestamp: string;
};

type ApiAlert = {
  id: string;
  deviceId: string;
  alertType: string;
  message: string;
  createdAt: string;
};

type Presentation = { variant: HistoryVariant; title: string; category: HistoryCategory };

const EVENT_PRESENTATION: Record<ApiEvent["eventType"], Presentation> = {
  SITE_BLOCKED: { variant: "blocked", title: "Sitio bloqueado", category: "blocked" },
  ACCESS_ATTEMPT: { variant: "blocked", title: "Sitio bloqueado", category: "blocked" },
  UNINSTALL_ATTEMPT: { variant: "attention", title: "¡Requiere tu atención!", category: "security" },
  BYPASS_ATTEMPT: { variant: "attention", title: "¡Requiere tu atención!", category: "security" },
  APP_INSTALL_ATTEMPT: { variant: "alert", title: "Intento de modificación", category: "security" },
  PROTECTION_MODIFIED: { variant: "settings", title: "Configuración actualizada", category: "settings" },
};

/** Los cambios de protección se distinguen por el texto que manda el celular. */
function protectionPresentation(details: string): Presentation {
  const text = details.toLowerCase();
  if (text.includes("reactiv")) {
    return { variant: "protected", title: "Protección reactivada", category: "settings" };
  }
  if (text.includes("paus")) {
    return { variant: "alert", title: "Protección pausada", category: "settings" };
  }
  if (text.includes("desactiv")) {
    return { variant: "alert", title: "Modo protegido desactivado", category: "settings" };
  }
  return EVENT_PRESENTATION.PROTECTION_MODIFIED;
}

function eventDescription(event: ApiEvent): string {
  if (event.eventType === "SITE_BLOCKED" || event.eventType === "ACCESS_ATTEMPT") {
    return event.domain || "Sitio restringido";
  }
  const short = EVENT_SHORT_DETAIL[event.eventType];
  if (short) return short;
  return shortDetails(event.details) || (event.domain ?? "");
}

/**
 * Historial de actividad: eventos registrados por los dispositivos protegidos,
 * más la creación y la vinculación de cada perfil.
 */
export async function getHistoryEvents(): Promise<HistoryEvent[]> {
  const [eventsData, alertsData, devices] = await Promise.all([
    apiRequest<{ events: ApiEvent[] }>("/api/events"),
    apiRequest<{ alerts: ApiAlert[] }>("/api/events/alerts"),
    getDevices(),
  ]);
  const names = new Map(devices.map((device) => [device.id, device.name]));
  const deviceName = (id: string) => names.get(id) ?? "Dispositivo";

  const fromEvents = eventsData.events.map((event): HistoryEvent => {
    const presentation =
      event.eventType === "PROTECTION_MODIFIED"
        ? protectionPresentation(event.details ?? "")
        : (EVENT_PRESENTATION[event.eventType] ?? EVENT_PRESENTATION.PROTECTION_MODIFIED);
    return {
      id: event.id,
      variant: presentation.variant,
      title: presentation.title,
      description: eventDescription(event),
      time: formatTime(event.timestamp),
      device: deviceName(event.deviceId),
      deviceId: event.deviceId,
      category: presentation.category,
      date: formatDayLabel(event.timestamp),
      timestamp: event.timestamp,
      domain: event.domain,
      eventType: event.eventType,
      details: event.details,
    };
  });

  const fromLinking = alertsData.alerts
    .filter((alert) => alert.alertType === "DEVICE_LINKED" || alert.alertType === "DEVICE_PENDING")
    .map((alert): HistoryEvent => {
      const linked = alert.alertType === "DEVICE_LINKED";
      return {
        id: `alert-${alert.id}`,
        variant: linked ? "protected" : "settings",
        title: linked ? "Protección activada" : "Perfil creado",
        description: linked ? "Celular vinculado" : "Pendiente de vinculación",
        time: formatTime(alert.createdAt),
        device: deviceName(alert.deviceId),
        deviceId: alert.deviceId,
        category: linked ? "security" : "settings",
        date: formatDayLabel(alert.createdAt),
        timestamp: alert.createdAt,
        eventType: alert.alertType,
        details: alert.message,
      };
    });

  return [...fromEvents, ...fromLinking].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
}

export async function getHistoryEventById(
  historyId: string,
): Promise<HistoryEvent | undefined> {
  const events = await getHistoryEvents();
  return events.find((event) => event.id === historyId);
}

export async function getDeviceActivities(deviceId: string): Promise<HistoryEvent[]> {
  const events = await getHistoryEvents();
  return events.filter((event) => event.deviceId === deviceId);
}
