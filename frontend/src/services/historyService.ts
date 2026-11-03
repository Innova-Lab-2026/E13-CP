import type { HistoryVariant } from "../components/historial/HistoryCard";
import { apiRequest } from "./api";
import { getDevices } from "./deviceService";
import { formatDayLabel, formatTime } from "../utils/date";

export type HistoryCategory = "blocked" | "security" | "settings";

export interface HistoryEvent {
  id: string;
  variant: HistoryVariant;
  title: string;
  description: string;
  time: string;
  device: string;
  deviceId: string;
  category: HistoryCategory;
  /** "Hoy", "Ayer" o dd/mm/aaaa. */
  date: string;
  timestamp: string;
  domain?: string;
}

type ApiEvent = {
  id: string;
  deviceId: string;
  eventType: "ACCESS_ATTEMPT" | "APP_INSTALL_ATTEMPT" | "PROTECTION_MODIFIED" | "BYPASS_ATTEMPT";
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

const EVENT_PRESENTATION: Record<
  ApiEvent["eventType"],
  { variant: HistoryVariant; title: string; category: HistoryCategory }
> = {
  ACCESS_ATTEMPT: { variant: "blocked", title: "Sitio web bloqueado", category: "blocked" },
  BYPASS_ATTEMPT: { variant: "alert", title: "Intento de evasión", category: "security" },
  APP_INSTALL_ATTEMPT: { variant: "alert", title: "Intento de instalación", category: "security" },
  PROTECTION_MODIFIED: { variant: "settings", title: "Protección modificada", category: "settings" },
};

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
      EVENT_PRESENTATION[event.eventType] ?? EVENT_PRESENTATION.PROTECTION_MODIFIED;
    return {
      id: event.id,
      variant: presentation.variant,
      title: presentation.title,
      description: event.domain ? `${event.details} (${event.domain})` : event.details,
      time: formatTime(event.timestamp),
      device: deviceName(event.deviceId),
      deviceId: event.deviceId,
      category: presentation.category,
      date: formatDayLabel(event.timestamp),
      timestamp: event.timestamp,
      domain: event.domain,
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
        description: alert.message,
        time: formatTime(alert.createdAt),
        device: deviceName(alert.deviceId),
        deviceId: alert.deviceId,
        category: linked ? "security" : "settings",
        date: formatDayLabel(alert.createdAt),
        timestamp: alert.createdAt,
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
