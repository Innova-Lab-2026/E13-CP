import { v4 as uuidv4 } from 'uuid';
import {
  db,
  BlocklistItem,
  BlocklistStatus,
  BlocklistSyncLog,
  buildOfficialBlocklistItems
} from '../config/db';
import {
  CURRENT_OFFICIAL_BLOCKLIST,
  CUSTOM_DOMAIN_CATEGORY,
  OfficialBlocklistSnapshot
} from '../config/blocklistSource';

/** Normaliza un dominio a minúsculas y sin espacios. */
export const normalizeDomain = (domain: string): string => domain.toLowerCase().trim();

/**
 * Sincroniza la lista oficial de LOTBA.
 *
 * Reemplaza por completo los dominios oficiales, conserva intactos los
 * dominios personalizados de cada adulto responsable y registra la operación
 * en el log de auditoría (requisito MVP: "registro de la actualización de la
 * lista de bloqueo").
 */
export const syncOfficialBlocklist = (
  snapshot: OfficialBlocklistSnapshot,
  requestedBy: string
) => {
  const previousOfficial = db.blocklist.filter(item => item.type === 'LOTBA_OFFICIAL');
  const customItems = db.blocklist.filter(item => item.type === 'CUSTOM');

  const nextOfficial = buildOfficialBlocklistItems(snapshot);

  const previousDomains = new Set(previousOfficial.map(item => item.domain));
  const nextDomains = new Set(nextOfficial.map(item => item.domain));

  const added = [...nextDomains].filter(domain => !previousDomains.has(domain));
  const removed = [...previousDomains].filter(domain => !nextDomains.has(domain));

  db.blocklist = [...nextOfficial, ...customItems];

  const syncLog: BlocklistSyncLog = {
    id: uuidv4(),
    version: snapshot.version,
    source: snapshot.source,
    updatedAt: new Date().toISOString(),
    totalOfficial: nextOfficial.length,
    added,
    removed,
    requestedBy
  };

  db.blocklistSyncLog.push(syncLog);

  return { syncLog, added, removed, totalOfficial: nextOfficial.length };
};

/**
 * Estado de actualización de la lista de bloqueo.
 * `responsibleId` es opcional: si no se informa, el conteo de personalizados
 * considera todos los dominios personalizados del sistema.
 */
export const getBlocklistStatus = (responsibleId?: string): BlocklistStatus => {
  const official = db.blocklist.filter(item => item.type === 'LOTBA_OFFICIAL');
  const custom = db.blocklist.filter(
    item => item.type === 'CUSTOM' && (!responsibleId || item.addedBy === responsibleId)
  );

  const lastSync = db.blocklistSyncLog[db.blocklistSyncLog.length - 1];

  return {
    version: lastSync?.version ?? CURRENT_OFFICIAL_BLOCKLIST.version,
    source: lastSync?.source ?? CURRENT_OFFICIAL_BLOCKLIST.source,
    lastUpdated: lastSync?.updatedAt ?? CURRENT_OFFICIAL_BLOCKLIST.updatedAt,
    totalOfficial: official.length,
    totalCustom: custom.length
  };
};

/**
 * Busca el ítem de la lista que coincide con el dominio consultado.
 * La comparación es por subcadena para cubrir URLs con protocolo, rutas y subdominios.
 */
export const findMatchingBlocklistItem = (
  domain: string
): BlocklistItem | undefined => {
  const cleanDomain = normalizeDomain(domain);
  return db.blocklist.find(item => cleanDomain.includes(item.domain));
};

/** Construye un ítem personalizado para un adulto responsable. */
export const buildCustomBlocklistItem = (
  domain: string,
  responsibleId: string
): BlocklistItem => {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    domain: normalizeDomain(domain),
    type: 'CUSTOM',
    addedBy: responsibleId,
    categoria: CUSTOM_DOMAIN_CATEGORY,
    updatedAt: now,
    createdAt: now
  };
};
