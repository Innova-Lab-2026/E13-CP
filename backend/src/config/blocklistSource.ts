/**
 * Fuente de verdad de la lista oficial de sitios bloqueados provista por LOTBA.
 *
 * Hasta la fecha no existe una API externa de actualización automática: el listado
 * oficial se recibe como un archivo/listado estático y se actualiza mensualmente.
 * Por eso la fuente vive en el backend como un módulo versionado, y el endpoint
 * `POST /api/blocklist/sync/official` queda preparado para cargar un nuevo
 * período cuando el equipo reciba el listado definitivo.
 *
 * Cuando exista la sincronización automática, alcanza con reemplazar el
 * contenido de `CURRENT_OFFICIAL_BLOCKLIST` por la respuesta del servicio externo.
 */

export interface OfficialDomain {
  /** Dominio bloqueado, sin protocolo ni ruta. */
  domain: string;
  /** Categoría funcional usada por la app para clasificar el bloqueo. */
  categoria: string;
}

export interface OfficialBlocklistSnapshot {
  /** Período del listado. Formato `AAAA-MM` (actualización mensual). */
  version: string;
  /** Origen del listado, mostrado en el estado de actualización. */
  source: string;
  /** Fecha de publicación del listado oficial. */
  updatedAt: string;
  domains: OfficialDomain[];
}

/**
 * Listado oficial vigente.
 *
 * ⚠️ MOCK: dominios ficticios que simulan el listado real de LOTBA.
 * Deben reemplazarse por los dominios oficiales al recibir el primer listado.
 */
export const CURRENT_OFFICIAL_BLOCKLIST: OfficialBlocklistSnapshot = {
  version: '2026-10',
  source: 'LOTBA - listado oficial mensual (simulado)',
  updatedAt: '2026-10-01T00:00:00.000Z',
  domains: [
    { domain: 'apuestasilegalesba.com', categoria: 'Apuestas' },
    { domain: 'casinoilegalar.net', categoria: 'Apuestas' },
    { domain: 'ruletasin18.com', categoria: 'Apuestas' },
    { domain: 'betnoregulated.org', categoria: 'Apuestas' }
  ]
};

/** Categoría asignada a los dominios agregados por el adulto responsable. */
export const CUSTOM_DOMAIN_CATEGORY = 'Personalizado';
