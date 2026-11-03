import { apiRequest } from "./api";
import { getDevices } from "./deviceService";
import { formatDayLabel, formatTime } from "../utils/date";

export type AlertType = "danger" | "blocked" | "warning" | "info";

export interface Alert {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  date: string;
  type: AlertType;
  device: string;
  deviceId: string;
  description: string;
  read: boolean;
  createdAt: string;
  site?: string;
}

type ApiAlert = {
  id: string;
  deviceId: string;
  alertType: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const ALERT_PRESENTATION: Record<string, { title: string; type: AlertType }> = {
  ACCESS_ATTEMPT: { title: "Sitio bloqueado", type: "blocked" },
  BYPASS_ATTEMPT: { title: "¡Requiere tu atención!", type: "danger" },
  APP_INSTALL_ATTEMPT: { title: "Intento de instalación", type: "warning" },
  DEVICE_PENDING: { title: "Dispositivo pendiente", type: "info" },
  DEVICE_LINKED: { title: "Dispositivo vinculado", type: "info" },
};

/** El backend menciona el sitio en el mensaje: "...al sitio dominio.com desde...". */
function extractSite(message: string): string | undefined {
  const match = /sitio\s+([a-z0-9.-]+\.[a-z]{2,})/i.exec(message);
  return match?.[1];
}

export async function getAlerts(): Promise<Alert[]> {
  const [data, devices] = await Promise.all([
    apiRequest<{ alerts: ApiAlert[] }>("/api/events/alerts"),
    getDevices(),
  ]);
  const names = new Map(devices.map((device) => [device.id, device.name]));

  return data.alerts
    .map((alert): Alert => {
      const presentation = ALERT_PRESENTATION[alert.alertType] ?? {
        title: "Alerta",
        type: "warning" as const,
      };
      const device = names.get(alert.deviceId) ?? "Dispositivo";
      const site = extractSite(alert.message);
      return {
        id: alert.id,
        title: presentation.title,
        subtitle: site ? `${device} - ${site}` : device,
        time: formatTime(alert.createdAt),
        date: formatDayLabel(alert.createdAt),
        type: presentation.type,
        device,
        deviceId: alert.deviceId,
        description: alert.message,
        read: alert.read,
        createdAt: alert.createdAt,
        site,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAlertById(alertId: string): Promise<Alert | undefined> {
  const alerts = await getAlerts();
  return alerts.find((alert) => alert.id === alertId);
}

export async function markAlertRead(alertId: string): Promise<void> {
  await apiRequest(`/api/events/alerts/${encodeURIComponent(alertId)}/read`, {
    method: "PATCH",
  });
}
