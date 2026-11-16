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

/** Consulta si un dominio está en la lista de LOTBA o en la lista personalizada. */
export async function checkDomain(domain: string): Promise<DomainCheck> {
  return apiRequest<DomainCheck>("/api/blocklist/check", {
    method: "POST",
    body: { domain },
    // Con el token, el servidor suma los sitios personalizados de esta cuenta.
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
