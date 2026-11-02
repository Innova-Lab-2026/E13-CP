import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, Responsible, UserMode, UserRole, USER_MODES } from '../config/db';
import { AuthRequest, JWT_SECRET } from '../middleware/auth.middleware';
import {
  isValidPin,
  PIN_LENGTH,
  setResponsiblePin,
  verifyResponsiblePin
} from '../services/device.service';

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
  /** Indica si el adulto ya configuró su PIN de seguridad (nunca expone el hash). */
  hasPin: Boolean(responsible.pinHash),
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
 * PATCH /api/auth/pin
 * Configura el PIN de seguridad de 4 dígitos con el que el adulto autoriza
 * la vinculación de dispositivos y los cambios críticos.
 *
 * El PIN se cifra con bcrypt y nunca se devuelve ni se almacena en texto plano.
 * Solo puede existir un PIN activo por responsable: el nuevo sobrescribe al anterior.
 */
export const updateMyPin = async (req: AuthRequest, res: Response) => {
  try {
    const { pin } = req.body as { pin?: unknown };

    if (!isValidPin(pin)) {
      return res.status(400).json({
        error: `El PIN debe tener exactamente ${PIN_LENGTH} dígitos numéricos`
      });
    }

    const responsible = db.responsables.find(r => r.id === req.responsibleId);

    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    await setResponsiblePin(responsible, pin);

    return res.status(200).json({ message: 'PIN creado con éxito' });
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

/**
 * POST /api/auth/pin/verify
 * Verifica el PIN del adulto sin modificarlo. Lo usa el dispositivo protegido
 * para autorizar acciones críticas (por ejemplo, salir del modo protegido).
 */
export const verifyMyPin = async (req: AuthRequest, res: Response) => {
  try {
    const { pin } = req.body as { pin?: unknown };

    if (!isValidPin(pin)) {
      return res.status(400).json({
        error: `El PIN debe tener exactamente ${PIN_LENGTH} dígitos numéricos`
      });
    }

    const responsible = db.responsables.find(r => r.id === req.responsibleId);

    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    if (!responsible.pinHash) {
      return res.status(409).json({
        error: 'El responsable todavía no configuró un PIN de seguridad'
      });
    }

    const isValid = await verifyResponsiblePin(responsible, pin);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    return res.status(200).json({ message: 'PIN válido', valid: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * PATCH /api/auth/me
 * Actualiza los datos editables de "Mi cuenta": nombre y teléfono.
 */
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, telefono } = req.body as { name?: unknown; telefono?: unknown };

    if (name === undefined && telefono === undefined) {
      return res.status(400).json({ error: 'Enviá al menos un campo para actualizar' });
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'El nombre debe ser un texto' });
    }

    if (telefono !== undefined && typeof telefono !== 'string') {
      return res.status(400).json({ error: 'El teléfono debe ser un texto' });
    }

    const cleanPhone = typeof telefono === 'string' ? telefono.trim() : undefined;
    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'El teléfono no tiene un formato válido' });
    }

    const responsible = db.responsables.find(r => r.id === req.responsibleId);

    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    if (typeof name === 'string') {
      responsible.name = name.trim();
    }

    if (cleanPhone !== undefined) {
      responsible.telefono = cleanPhone || undefined;
    }

    return res.status(200).json(toPublicProfile(responsible));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * DELETE /api/auth/me
 * Elimina la cuenta del adulto y todo lo asociado: dispositivos, eventos,
 * alertas y dominios personalizados. Exige la contraseña como confirmación.
 */
export const deleteMyAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body as { password?: unknown };

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'La contraseña es obligatoria para eliminar la cuenta' });
    }

    const responsible = db.responsables.find(r => r.id === req.responsibleId);

    if (!responsible) {
      return res.status(404).json({ error: 'Responsible not found' });
    }

    const isMatch = await bcrypt.compare(password, responsible.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'La contraseña es incorrecta' });
    }

    const deviceIds = new Set(
      db.devices.filter(d => d.responsibleId === responsible.id).map(d => d.id)
    );

    db.devices = db.devices.filter(d => d.responsibleId !== responsible.id);
    db.events = db.events.filter(e => !deviceIds.has(e.deviceId));
    db.alerts = db.alerts.filter(a => a.responsibleId !== responsible.id);
    db.blocklist = db.blocklist.filter(
      item => item.type === 'LOTBA_OFFICIAL' || item.addedBy !== responsible.id
    );
    db.responsables = db.responsables.filter(r => r.id !== responsible.id);

    return res.status(200).json({ message: 'Cuenta eliminada' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
