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

const HOSTNAME_REGEX = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

/**
 * Lleva lo que tipea la persona ("https://www.sitio.com/juego?x=1", "Sitio.com")
 * al dominio pelado ("sitio.com"): sin protocolo, ruta, puerto ni "www.".
 * Los dominios con acentos quedan en punycode. Devuelve null si no es un sitio.
 */
export const extractDomain = (input: string): string | null => {
  const clean = normalizeDomain(input);
  if (!clean || /\s/.test(clean)) return null;

  let hostname: string;
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//.test(clean) ? clean : `http://${clean}`;
    hostname = new URL(withProtocol).hostname;
  } catch {
    return null;
  }

  const domain = hostname.replace(/\.$/, '').replace(/^www\./, '');
  return HOSTNAME_REGEX.test(domain) ? domain : null;
};

/**
 * Lista de bloqueo que ve un responsable (oficial de LOTBA + sus personalizados)
 * con su estado. La usan GET /api/blocklist (adulto) y GET /api/devices/me/blocklist
 * (celular vinculado por código).
 */
export const getBlocklistFor = (responsibleId?: string) => ({
  blocklist: db.blocklist.filter(item => isVisibleTo(item, responsibleId)),
  status: getBlocklistStatus(responsibleId)
});

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
  domain: string,
  responsibleId?: string
): BlocklistItem | undefined => {
  const cleanDomain = normalizeDomain(domain);
  return db.blocklist.find(
    item =>
      isVisibleTo(item, responsibleId) && cleanDomain.includes(item.domain)
  );
};

/**
 * Un ítem es visible para un responsable si es del listado oficial o si lo
 * agregó esa misma cuenta. Sin responsable, solo cuenta el listado oficial.
 */
export const isVisibleTo = (item: BlocklistItem, responsibleId?: string): boolean =>
  item.type === 'LOTBA_OFFICIAL' ||
  (!!responsibleId && item.type === 'CUSTOM' && item.addedBy === responsibleId);

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
