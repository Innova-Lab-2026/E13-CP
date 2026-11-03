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

import { LOTBA_DOMAINS, LOTBA_PERIOD, LOTBA_SOURCE, LOTBA_UPDATED_AT } from './lotbaDomains';

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
 * Listado oficial vigente: el último archivo de LOTBA, limpio y deduplicado.
 * Se genera con "Data Analytics/lista-lotba/limpiar_lista.py" (issue #9) en
 * `lotbaDomains.ts`; para cargar un período nuevo hay que regenerar ese archivo.
 */
export const CURRENT_OFFICIAL_BLOCKLIST: OfficialBlocklistSnapshot = {
  version: LOTBA_PERIOD,
  source: LOTBA_SOURCE,
  updatedAt: LOTBA_UPDATED_AT,
  domains: LOTBA_DOMAINS
};

/** Categoría asignada a los dominios agregados por el adulto responsable. */
export const CUSTOM_DOMAIN_CATEGORY = 'Personalizado';
