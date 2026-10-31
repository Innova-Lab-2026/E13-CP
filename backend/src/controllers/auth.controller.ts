import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, Responsible, UserMode, UserRole, USER_MODES } from '../config/db';
import { AuthRequest, JWT_SECRET } from '../middleware/auth.middleware';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\s()-]{7,15}$/;
const MIN_PASSWORD_LENGTH = 6;

interface RegisterRequest {
  nombre?: string;
  /** Alias aceptado por compatibilidad con clientes que envían `name`. */
  name?: string;
  email?: string;
  password?: string;
  telefono?: string;
  esResponsable?: boolean;
}

interface LoginRequest {
  email?: string;
  password?: string;
}

interface UpdateModeRequest {
  mode?: string;
}

/** Perfil público del usuario: nunca incluye el hash de la contraseña. */
const toPublicProfile = (responsible: Responsible) => ({
  id: responsible.id,
  email: responsible.email,
  name: responsible.name,
  rol: responsible.rol,
  mode: responsible.mode,
  telefono: responsible.telefono,
  createdAt: responsible.createdAt
});

/**
 * POST /api/auth/register
 * Registra un responsable/tutor, hashea la contraseña con bcryptjs y emite un JWT con el rol.
 */
export const registerResponsible = async (req: Request, res: Response) => {
  try {
    const { nombre, name, email, password, telefono, esResponsable } = req.body as RegisterRequest;

    if (
      (nombre !== undefined && typeof nombre !== 'string') ||
      (name !== undefined && typeof name !== 'string')
    ) {
      return res.status(400).json({ error: 'El nombre debe ser un texto' });
    }

    if (email !== undefined && typeof email !== 'string') {
      return res.status(400).json({ error: 'El email debe ser un texto' });
    }

    if (password !== undefined && typeof password !== 'string') {
      return res.status(400).json({ error: 'La contraseña debe ser un texto' });
    }

    const fullName = (nombre ?? name)?.trim();
    const cleanEmail = email?.trim().toLowerCase();

    if (telefono !== undefined && telefono !== null && typeof telefono !== 'string') {
      return res.status(400).json({ error: 'El teléfono debe ser un texto' });
    }

    const cleanPhone = typeof telefono === 'string' ? telefono.trim() : undefined;

    if (!fullName || !cleanEmail || !password) {
      return res.status(400).json({
        error: 'Nombre, email y password son obligatorios'
      });
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'El email no tiene un formato válido' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
      });
    }

    if (cleanPhone !== undefined && cleanPhone !== '' && !PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'El teléfono no tiene un formato válido' });
    }

    if (esResponsable !== undefined && typeof esResponsable !== 'boolean') {
      return res.status(400).json({ error: 'esResponsable debe ser un valor booleano' });
    }

    const existingUser = db.responsables.find(r => r.email === cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Responsible with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // `esResponsable` define el perfil emitido en el JWT.
    const rol: UserRole = esResponsable === false ? 'tutor' : 'responsable';

    const newResponsible: Responsible = {
      id: uuidv4(),
      email: cleanEmail,
      passwordHash,
      name: fullName,
      telefono: cleanPhone,
      rol,
      mode: 'adulto',
      createdAt: new Date().toISOString()
    };

    db.responsables.push(newResponsible);

    const token = jwt.sign(
      { id: newResponsible.id, email: newResponsible.email, rol: newResponsible.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Responsible registered successfully',
      token,
      responsible: toPublicProfile(newResponsible)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/auth/login
 * Verifica el hash con bcrypt y emite un JWT que incluye el rol.
 */
export const loginResponsible = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const responsible = db.responsables.find(r => r.email === cleanEmail);

    if (!responsible) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, responsible.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: responsible.id, email: responsible.email, rol: responsible.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      responsible: toPublicProfile(responsible)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/auth/me
 * Devuelve el perfil vigente del usuario autenticado (requiere JWT).
 */
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const responsible = db.responsables.find(r => r.id === req.responsibleId);

    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    return res.status(200).json(toPublicProfile(responsible));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * PATCH /api/auth/me/mode
 * Actualiza el modo de uso ("adulto" | "dispositivo_protegido") del usuario autenticado.
 */
export const updateMyMode = async (req: AuthRequest, res: Response) => {
  try {
    const { mode } = req.body as UpdateModeRequest;

    if (!mode) {
      return res.status(400).json({ error: 'Mode is required' });
    }

    if (!USER_MODES.includes(mode as UserMode)) {
      return res.status(400).json({
        error: `Invalid mode. Must be one of: ${USER_MODES.join(', ')}`
      });
    }

    const responsible = db.responsables.find(r => r.id === req.responsibleId);

    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    responsible.mode = mode as UserMode;

    return res.status(200).json(toPublicProfile(responsible));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
