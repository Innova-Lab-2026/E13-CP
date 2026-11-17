import { apiRequest } from "./api";

export type DomainCheck = {
  domain: string;
  isBlocked: boolean;
  categoria: string | null;
  matchedDomain: string | null;
};

export type BlocklistStatus = {
  version: string;
  source: string;
  lastUpdated: string;
  totalOfficial: number;
  totalCustom: number;
};

export type BlocklistItem = {
  id: string;
  domain: string;
  type: "LOTBA_OFFICIAL" | "CUSTOM";
  categoria: string;
};

/**
 * Consulta si un dominio está en la lista de LOTBA o en la lista personalizada.
 * Con el token del adulto o con la credencial del celular protegido ("device"),
 * el servidor suma los sitios personalizados de esa cuenta.
 */
export async function checkDomain(
  domain: string,
  auth: true | "device" = true,
): Promise<DomainCheck> {
  return apiRequest<DomainCheck>("/api/blocklist/check", {
    method: "POST",
    body: { domain },
    auth,
  });
}

export async function getBlocklist(): Promise<{
  blocklist: BlocklistItem[];
  status: BlocklistStatus;
}> {
  return apiRequest("/api/blocklist");
}

export async function addCustomDomain(domain: string): Promise<BlocklistItem> {
  const data = await apiRequest<{ item: BlocklistItem }>("/api/blocklist/custom", {
    method: "POST",
    body: { domain },
  });
  return data.item;
}

export async function removeCustomDomain(id: string): Promise<void> {
  await apiRequest(`/api/blocklist/custom/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Motivos para sugerir un sitio, en el orden en que se muestran. */
export const SUGGESTION_REASONS = [
  { value: "apuestas_ilegales", label: "Apuestas ilegales" },
  { value: "publicidad_apuestas", label: "Publicidad de apuestas" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado" },
  { value: "otro", label: "Otro" },
] as const;

export type SuggestionReason = (typeof SUGGESTION_REASONS)[number]["value"];

export const SUGGESTION_INFO_MAX_LENGTH = 500;

export type SiteSuggestion = {
  id: string;
  domain: string;
  motivo: SuggestionReason;
  info?: string;
  createdAt: string;
  status: string;
};

/** Envía un sitio para que el equipo lo revise con LOTBA. */
export async function suggestSite(payload: {
  url: string;
  motivo: SuggestionReason;
  info?: string;
}): Promise<SiteSuggestion> {
  const data = await apiRequest<{ suggestion: SiteSuggestion }>("/api/blocklist/suggestions", {
    method: "POST",
    body: payload,
  });
  return data.suggestion;
}

/**
 * Catálogo de eventos del Hito 3. ACCESS_ATTEMPT es el nombre anterior de
 * SITE_BLOCKED y se sigue aceptando por compatibilidad.
 */
export type SecurityEventType =
  | "SITE_BLOCKED"
  | "UNINSTALL_ATTEMPT"
  | "APP_INSTALL_ATTEMPT"
  | "BYPASS_ATTEMPT"
  | "ACCESS_ATTEMPT"
  | "PROTECTION_MODIFIED";

/**
 * Registra un evento del dispositivo protegido. Los intentos de acceso a sitios
 * bloqueados generan una alerta para el adulto responsable.
 */
export async function recordDeviceEvent(event: {
  deviceId: string;
  eventType: SecurityEventType;
  domain?: string;
  details: string;
}): Promise<void> {
  await apiRequest("/api/events", { method: "POST", body: event, auth: false });
}
