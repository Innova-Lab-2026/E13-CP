import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  buildCustomBlocklistItem,
  findMatchingBlocklistItem,
  getBlocklistStatus,
  normalizeDomain,
  syncOfficialBlocklist
} from '../services/blocklist.service';
import {
  CURRENT_OFFICIAL_BLOCKLIST,
  OfficialBlocklistSnapshot
} from '../config/blocklistSource';

/**
 * GET /api/blocklist
 * Lista el listado oficial de LOTBA junto con los dominios personalizados
 * del responsable autenticado.
 */
export const getBlocklist = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    // Official LOTBA domains + custom domains added by this responsible
    const items = db.blocklist.filter(
      item => item.type === 'LOTBA_OFFICIAL' || item.addedBy === responsibleId
    );

    return res.status(200).json({
      blocklist: items,
      status: getBlocklistStatus(responsibleId)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/blocklist/custom
 * Agrega un dominio personalizado a la lista de bloqueo del responsable.
 */
export const addCustomBlocklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const cleanDomain = normalizeDomain(domain);

    const existing = db.blocklist.find(item => item.domain === cleanDomain);
    if (existing) {
      return res.status(400).json({ error: 'Domain is already in the blocklist' });
    }

    const newItem = buildCustomBlocklistItem(cleanDomain, responsibleId!);

    db.blocklist.push(newItem);

    return res.status(201).json({
      message: 'Custom domain added to blocklist successfully',
      item: newItem
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * DELETE /api/blocklist/custom/:id
 * Elimina un dominio personalizado. La lista oficial no se puede modificar
 * desde el perfil del adulto responsable.
 */
export const removeCustomBlocklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { id } = req.params;

    const index = db.blocklist.findIndex(
      item =>
        item.id === id && item.type === 'CUSTOM' && item.addedBy === responsibleId
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Custom blocklist item not found or unauthorized' });
    }

    const removed = db.blocklist.splice(index, 1);

    return res.status(200).json({
      message: 'Custom blocklist item removed successfully',
      item: removed[0]
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/blocklist/check
 * Verifica si un dominio está bloqueado. Es la ruta que consume el servicio
 * local de VPN/DNS del dispositivo protegido.
 */
export const checkDomain = async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const cleanDomain = normalizeDomain(domain);
    const matchedItem = findMatchingBlocklistItem(cleanDomain);

    return res.status(200).json({
      domain: cleanDomain,
      isBlocked: !!matchedItem,
      // Alias de `isBlocked`, en línea con el contrato del diagrama de secuencia.
      blocked: !!matchedItem,
      matchType: matchedItem ? matchedItem.type : null,
      categoria: matchedItem ? matchedItem.categoria : null,
      matchedDomain: matchedItem ? matchedItem.domain : null
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/blocklist/status
 * Estado de actualización de la lista de bloqueo, para mostrarlo en la app.
 */
export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    return res.status(200).json(getBlocklistStatus(req.responsibleId));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/blocklist/sync/official
 * Sincroniza el listado oficial de LOTBA.
 *
 * Operación administrativa interna: no se expone desde el perfil del adulto
 * responsable. Si no se envía un listado, se recarga la fuente versionada
 * vigente (`config/blocklistSource`).
 */
export const syncOfficial = async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Partial<OfficialBlocklistSnapshot>;

    const snapshot: OfficialBlocklistSnapshot = {
      version: body.version ?? CURRENT_OFFICIAL_BLOCKLIST.version,
      source: body.source ?? CURRENT_OFFICIAL_BLOCKLIST.source,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
      domains: Array.isArray(body.domains) && body.domains.length > 0
        ? body.domains
        : CURRENT_OFFICIAL_BLOCKLIST.domains
    };

    const invalidDomain = snapshot.domains.find(
      entry => !entry.domain || typeof entry.domain !== 'string'
    );
    if (invalidDomain) {
      return res.status(400).json({ error: 'Cada dominio del listado debe ser un texto válido' });
    }

    const requestedByHeader = req.headers['x-admin-requested-by'];
    const requestedBy =
      typeof requestedByHeader === 'string' && requestedByHeader.trim()
        ? requestedByHeader.trim()
        : 'admin';

    const { syncLog, added, removed, totalOfficial } = syncOfficialBlocklist(
      snapshot,
      requestedBy
    );

    return res.status(200).json({
      message: 'Official LOTBA blocklist synchronized successfully',
      status: getBlocklistStatus(),
      sync: {
        version: syncLog.version,
        source: syncLog.source,
        updatedAt: syncLog.updatedAt,
        totalOfficial,
        added,
        removed
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
