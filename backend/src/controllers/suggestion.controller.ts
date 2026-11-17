import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, SiteSuggestion, SUGGESTION_REASONS, SuggestionReason } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { extractDomain } from '../services/blocklist.service';

/** Sugerencias que puede enviar un responsable en 24 horas. */
export const SUGGESTIONS_PER_DAY = 20;
/** Largo máximo de "Información adicional". */
export const SUGGESTION_INFO_MAX = 500;

const DAY_MS = 24 * 60 * 60 * 1000;

const isSuggestionReason = (value: unknown): value is SuggestionReason =>
  typeof value === 'string' && SUGGESTION_REASONS.includes(value as SuggestionReason);

/**
 * POST /api/blocklist/suggestions
 * El adulto sugiere un sitio para sumar a la lista ("Sugerir un sitio").
 * La dirección se guarda como dominio pelado y queda "pendiente" hasta que el
 * equipo la revise y la envíe a LOTBA. No cambia la lista de bloqueo.
 */
export const createSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId!;
    const { url, motivo, info } = (req.body ?? {}) as {
      url?: unknown;
      motivo?: unknown;
      info?: unknown;
    };

    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Por favor, ingresá la URL del sitio.' });
    }

    const domain = extractDomain(url);
    if (!domain) {
      return res.status(400).json({
        error: 'Revisá la dirección: tiene que ser un sitio, por ejemplo sitio.com.'
      });
    }

    if (!isSuggestionReason(motivo)) {
      return res.status(400).json({ error: 'Por favor, seleccioná el motivo.' });
    }

    if (info !== undefined && info !== null && typeof info !== 'string') {
      return res.status(400).json({ error: 'La información adicional tiene que ser un texto.' });
    }
    const cleanInfo = typeof info === 'string' ? info.trim() : '';
    if (Array.from(cleanInfo).length > SUGGESTION_INFO_MAX) {
      return res.status(400).json({
        error: `La información adicional puede tener hasta ${SUGGESTION_INFO_MAX} caracteres.`
      });
    }

    const since = Date.now() - DAY_MS;
    const sentToday = db.siteSuggestions.filter(
      s => s.responsibleId === responsibleId && Date.parse(s.createdAt) > since
    ).length;
    if (sentToday >= SUGGESTIONS_PER_DAY) {
      return res.status(429).json({
        error: `Llegaste al límite de ${SUGGESTIONS_PER_DAY} sugerencias por día. Probá de nuevo mañana.`
      });
    }

    const suggestion: SiteSuggestion = {
      id: uuidv4(),
      responsibleId,
      domain,
      motivo,
      ...(cleanInfo ? { info: cleanInfo } : {}),
      createdAt: new Date().toISOString(),
      status: 'pendiente'
    };

    db.siteSuggestions.push(suggestion);

    return res.status(201).json({ message: 'Sugerencia enviada', suggestion });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/blocklist/suggestions ⚙️
 * Listado para revisar las sugerencias y enviarlas a LOTBA (más nuevas primero).
 * Operación interna, protegida con x-admin-secret como la sincronización.
 * Acepta ?status=pendiente para filtrar.
 */
export const listSuggestions = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const suggestions = db.siteSuggestions
      .filter(s => typeof status !== 'string' || !status || s.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return res.status(200).json({ total: suggestions.length, suggestions });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
