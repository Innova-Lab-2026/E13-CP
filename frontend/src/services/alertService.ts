import { apiRequest } from "./api";
import { getDevices } from "./deviceService";
import { formatDayLabel, formatTime } from "../utils/date";
import { EVENT_SHORT_DETAIL } from "../components/historial/historyFormat";

export type AlertType = "danger" | "blocked" | "warning" | "info";

export interface Alert {
  id: string;
  title: string;
  /** "Sofía - bplay.bet.ar", "Sofía intentó desinstalar la aplicación", etc. */
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
  /** Tipo que manda el backend (SITE_BLOCKED, DEVICE_LINKED...). */
  alertType?: string;
}

type ApiAlert = {
  id: string;
  deviceId: string;
  alertType: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type Presentation = {
  title: string;
  type: AlertType;
  /** Subtítulo de la tarjeta a partir del nombre del perfil y del sitio (si hay). */
  subtitle: (device: string, site?: string) => string;
};

const withDetail = (detail: string) => (device: string) => `${device} - ${detail}`;

const ALERT_PRESENTATION: Record<string, Presentation> = {
  SITE_BLOCKED: {
    title: "Sitio bloqueado",
    type: "blocked",
    subtitle: (device, site) => `${device} - ${site ?? "Sitio restringido"}`,
  },
  ACCESS_ATTEMPT: {
    title: "Sitio bloqueado",
    type: "blocked",
    subtitle: (device, site) => `${device} - ${site ?? "Sitio restringido"}`,
  },
  UNINSTALL_ATTEMPT: {
    title: "¡Requiere tu atención!",
    type: "danger",
    subtitle: (device) => `${device} intentó desinstalar la aplicación`,
  },
  BYPASS_ATTEMPT: {
    title: "¡Requiere tu atención!",
    type: "danger",
    subtitle: (device) => `${device} intentó desactivar la protección`,
  },
  APP_INSTALL_ATTEMPT: {
    title: "Intento de modificación",
    type: "warning",
    subtitle: withDetail(EVENT_SHORT_DETAIL.APP_INSTALL_ATTEMPT),
  },
  PROTECTION_MODIFIED: {
    title: "Intento de modificación",
    type: "warning",
    subtitle: withDetail("Configuración protegida"),
  },
  DEVICE_PENDING: {
    title: "Dispositivo pendiente",
    type: "info",
    subtitle: withDetail("Pendiente de vinculación"),
  },
  DEVICE_LINKED: {
    title: "Dispositivo vinculado",
    type: "info",
    subtitle: withDetail("Protección activada"),
  },
  DEVICE_UNLINKED: {
    title: "Dispositivo desvinculado",
    type: "warning",
    subtitle: withDetail("Sin protección"),
  },
};

const FALLBACK: Presentation = {
  title: "Alerta",
  type: "warning",
  subtitle: (device, site) => (site ? `${device} - ${site}` : device),
};

/** El backend menciona el sitio en el mensaje: "...al sitio dominio.com desde...". */
function extractSite(message: string): string | undefined {
  const match = /sitio\s+([a-z0-9.-]+\.[a-z]{2,})/i.exec(message);
  return match?.[1];
}

/**
 * Avisos informativos: crear un perfil y vincular un celular. No piden que el
 * adulto haga nada, así que no van en "Mis alertas" ni suman a la campana (Figma
 * "Alertas"); se ven en el Historial como "Perfil creado" y "Protección activada".
 */
const INFO_ALERT_TYPES = new Set(["DEVICE_PENDING", "DEVICE_LINKED"]);

/** Alertas que pueden requerir algo del adulto: las de "Mis alertas" y la campana. */
export async function getAlerts(): Promise<Alert[]> {
  const alerts = await getAllAlerts();
  return alerts.filter((alert) => !INFO_ALERT_TYPES.has(alert.alertType ?? ""));
}

/** Todas las alertas, incluidos los avisos informativos (para abrir su detalle). */
async function getAllAlerts(): Promise<Alert[]> {
  const [data, devices] = await Promise.all([
    apiRequest<{ alerts: ApiAlert[] }>("/api/events/alerts"),
    getDevices(),
  ]);
  const names = new Map(devices.map((device) => [device.id, device.name]));

  return data.alerts
    .map((alert): Alert => {
      const presentation = ALERT_PRESENTATION[alert.alertType] ?? FALLBACK;
      const device = names.get(alert.deviceId) ?? "Dispositivo";
      const site = extractSite(alert.message);
      return {
        id: alert.id,
        title: presentation.title,
        subtitle: presentation.subtitle(device, site),
        time: formatTime(alert.createdAt),
        date: formatDayLabel(alert.createdAt),
        type: presentation.type,
        device,
        deviceId: alert.deviceId,
        description: alert.message,
        read: alert.read,
        createdAt: alert.createdAt,
        site,
        alertType: alert.alertType,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAlertById(alertId: string): Promise<Alert | undefined> {
  const alerts = await getAllAlerts();
  return alerts.find((alert) => alert.id === alertId);
}

export async function markAlertRead(alertId: string): Promise<void> {
  await apiRequest(`/api/events/alerts/${encodeURIComponent(alertId)}/read`, {
    method: "PATCH",
  });
}
