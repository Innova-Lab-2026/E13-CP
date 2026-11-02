import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'ba-protege-secret-key-2026';

if (process.env.NODE_ENV !== 'test' && !process.env.JWT_SECRET) {
  console.warn(
    '[auth] JWT_SECRET no está definido. Se usa la clave por defecto: definí la variable en el .env antes de desplegar.'
  );
}

export interface AuthRequest extends Request {
  responsibleId?: string;
  userEmail?: string;
  /** Perfil del usuario autenticado, inyectado a partir del claims del JWT. */
  rol?: UserRole;
}

/**
 * Exige un Bearer token válido e inyecta los claims del usuario en `req`.
 * - Token ausente            -> 401
 * - Token inválido o vencido -> 403
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token expired or invalid' });
    }
    req.responsibleId = user.id;
    req.userEmail = user.email;
    req.rol = user.rol;
    next();
  });
};

/**
 * Restringe el acceso a los perfiles indicados.
 * Debe ejecutarse siempre después de `authenticateToken`.
 *
 * ⚠️ No aplicar al flujo de "Modo Dispositivo Protegido": el dispositivo
 * protegido opera con la cuenta del adulto responsable, por lo que filtrar por
 * `rol` bloquearía también el celular del menor. La autorización de las
 * operaciones críticas la resuelve el PIN del adulto.
 *
 * En el alcance del MVP tampoco hay diferencias de permisos entre `responsable`
 * y `tutor`: ambos son adultos administradores. El middleware queda disponible
 * para el escalamiento institucional del Future Scope.
 */
export const authorizeRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.rol) {
      return res.status(401).json({ error: 'Access token missing or invalid' });
    }

    if (!allowedRoles.includes(req.rol)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

export { JWT_SECRET };
