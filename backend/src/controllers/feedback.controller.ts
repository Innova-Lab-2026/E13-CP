import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, FeedbackItem } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

/** Largo mínimo y máximo de la opinión, en caracteres. */
export const FEEDBACK_MIN_LENGTH = 3;
export const FEEDBACK_MAX_LENGTH = 1000;
/** Opiniones que puede enviar un responsable en 24 horas. */
export const FEEDBACK_PER_DAY = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/feedback
 * "Ayudanos a mejorar": el adulto responde "¿Cómo podríamos mejorar?" desde la app.
 * Se guarda en el estado persistido para que el equipo lo lea con GET /api/feedback.
 */
export const createFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId!;
    const { text } = (req.body ?? {}) as { text?: unknown };

    if (text !== undefined && text !== null && typeof text !== 'string') {
      return res.status(400).json({ error: 'La opinión tiene que ser un texto.' });
    }
    const clean = typeof text === 'string' ? text.trim() : '';
    const length = Array.from(clean).length;

    if (!clean) {
      return res.status(400).json({ error: 'Por favor, contanos cómo podríamos mejorar.' });
    }
    if (length < FEEDBACK_MIN_LENGTH) {
      return res.status(400).json({
        error: `Escribí al menos ${FEEDBACK_MIN_LENGTH} caracteres.`
      });
    }
    if (length > FEEDBACK_MAX_LENGTH) {
      return res.status(400).json({
        error: `La opinión puede tener hasta ${FEEDBACK_MAX_LENGTH} caracteres.`
      });
    }

    const since = Date.now() - DAY_MS;
    const sentToday = db.feedback.filter(
      item => item.responsibleId === responsibleId && Date.parse(item.createdAt) > since
    ).length;
    if (sentToday >= FEEDBACK_PER_DAY) {
      return res.status(429).json({
        error: `Llegaste al límite de ${FEEDBACK_PER_DAY} opiniones por día. Probá de nuevo mañana.`
      });
    }

    const item: FeedbackItem = {
      id: uuidv4(),
      responsibleId,
      text: clean,
      createdAt: new Date().toISOString()
    };
    db.feedback.push(item);

    return res.status(201).json({ message: 'Opinión enviada', feedback: item });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/feedback ⚙️
 * Listado interno de opiniones (más nuevas primero), protegido con
 * x-admin-secret como el listado de sugerencias.
 */
export const listFeedback = async (_req: Request, res: Response) => {
  try {
    const feedback = [...db.feedback].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.status(200).json({ total: feedback.length, feedback });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
