import { Request, Response, NextFunction } from 'express';

/**
 * Protege las operaciones administrativas del backend.
 *
 * La lista oficial de LOTBA no puede modificarse desde el perfil del adulto
 * responsable (requisito del MVP). Como no existe todavía una API externa ni
 * un panel institucional, la actualización del listado mensual es una tarea
 * operativa interna del equipo, protegida por un secreto de servicio.
 *
 * Cuando exista la actualización automática o el dashboard institucional del
 * Future Scope, este middleware se reemplaza por la autorización correspondiente.
 */
export const requireAdminSecret = (req: Request, res: Response, next: NextFunction) => {
  // Se lee en cada request para poder configurar la variable en runtime.
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(503).json({
      error: 'La sincronización administrativa no está habilitada. Configurá ADMIN_SECRET.'
    });
  }

  const provided = req.headers['x-admin-secret'];

  if (!provided || provided !== adminSecret) {
    return res.status(401).json({ error: 'Invalid admin secret' });
  }

  next();
};

export { };
