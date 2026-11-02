import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../index';
import { db } from '../config/db';
import { JWT_SECRET, authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const VALID_USER = {
  nombre: 'Ana Pérez',
  email: 'ana@mail.com',
  password: 'Str0ng!Pass',
  telefono: '+5491122334455',
  esResponsable: true
};

beforeEach(() => {
  // Reset in-memory database between tests
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.blocklist = [];
});

/** Registra un usuario y devuelve el token emitido. */
const registerAndLogin = async (overrides: Record<string, unknown> = {}) => {
  const payload = { ...VALID_USER, ...overrides };
  const res = await request(app).post('/api/auth/register').send(payload);
  return res.body.token as string;
};

// ---------------------------------------------------------------------------
// BK-1.1 — Registro de responsable con rol/tipo de usuario
// ---------------------------------------------------------------------------
describe('BK-1.1 - POST /api/auth/register', () => {
  test('retorna 201 con token y responsable con rol', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.responsible.id).toBeDefined();
    expect(res.body.responsible.email).toBe('ana@mail.com');
    expect(res.body.responsible.name).toBe('Ana Pérez');
    expect(res.body.responsible.rol).toBe('responsable');
  });

  test('deriva el rol "tutor" cuando esResponsable es false', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'tutor@mail.com', esResponsable: false });

    expect(res.status).toBe(201);
    expect(res.body.responsible.rol).toBe('tutor');
  });

  test('guarda la contraseña cifrada con bcrypt (nunca en texto plano)', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const stored = db.responsables.find(r => r.email === 'ana@mail.com');
    expect(stored).toBeDefined();
    expect(stored!.passwordHash).not.toBe(VALID_USER.password);
    expect(stored!.passwordHash).not.toContain(VALID_USER.password);
    expect(await bcrypt.compare(VALID_USER.password, stored!.passwordHash)).toBe(true);
  });

  test('el JWT contiene id, email y rol, con vigencia de 7 días', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    const payload: any = jwt.decode(res.body.token);
    expect(payload.id).toBe(res.body.responsible.id);
    expect(payload.email).toBe('ana@mail.com');
    expect(payload.rol).toBe('responsable');
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  test('persiste esResponsable, telefono y mode por defecto', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const stored = db.responsables.find(r => r.email === 'ana@mail.com');
    expect(stored!.telefono).toBe('+5491122334455');
    expect(stored!.mode).toBe('adulto');
  });

  test('acepta el alias "name" para mantener compatibilidad con el cliente actual', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alias@mail.com', password: 'password123', name: 'Carlos Padre' });

    expect(res.status).toBe(201);
    expect(res.body.responsible.name).toBe('Carlos Padre');
  });

  test('retorna 400 con email duplicado', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('retorna 400 con datos incompletos', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@mail.com' });

    expect(res.status).toBe(400);
  });

  test('retorna 400 con email inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'no-es-un-mail' });

    expect(res.status).toBe(400);
  });

  test('retorna 400 con contraseña de menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, password: '123' });

    expect(res.status).toBe(400);
  });

  test('retorna 400 con teléfono inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, telefono: 'abc' });

    expect(res.status).toBe(400);
  });

  test('retorna 400 si esResponsable no es booleano', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, esResponsable: 'sí' });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// BK-1.2 — Inicio de sesión y emisión de JWT con rol
// ---------------------------------------------------------------------------
describe('BK-1.2 - POST /api/auth/login', () => {
  test('retorna 200 con token y rol para credenciales válidas', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.responsible.email).toBe('ana@mail.com');
    expect(res.body.responsible.rol).toBe('responsable');
  });

  test('el JWT emitido en el login incluye el rol', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    const payload: any = jwt.decode(res.body.token);
    expect(payload.rol).toBe('responsable');
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  test('nunca expone el passwordHash en la respuesta', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.body.responsible.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  test('retorna 401 con contraseña incorrecta', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'ClaveIncorrecta1' });

    expect(res.status).toBe(401);
  });

  test('retorna 401 con email inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@mail.com', password: VALID_USER.password });

    expect(res.status).toBe(401);
  });

  test('retorna 400 con datos incompletos', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: VALID_USER.email });

    expect(res.status).toBe(400);
  });

  test('el login no es sensible a mayúsculas en el email', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ANA@MAIL.COM', password: VALID_USER.password });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// BK-1.3 — Configuración y consulta del modo de usuario
// ---------------------------------------------------------------------------
describe('BK-1.3 - PATCH /api/auth/me/mode y GET /api/auth/me', () => {
  test('PATCH actualiza el modo y lo persiste', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .patch('/api/auth/me/mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'dispositivo_protegido' });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('dispositivo_protegido');

    const stored = db.responsables.find(r => r.email === 'ana@mail.com');
    expect(stored!.mode).toBe('dispositivo_protegido');
  });

  test('GET /api/auth/me devuelve el modo persistido', async () => {
    const token = await registerAndLogin();

    await request(app)
      .patch('/api/auth/me/mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'dispositivo_protegido' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('dispositivo_protegido');
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('ana@mail.com');
    expect(res.body.name).toBe('Ana Pérez');
    expect(res.body.rol).toBe('responsable');
    expect(res.body.createdAt).toBeDefined();
  });

  test('PATCH retorna 400 con un modo inválido', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .patch('/api/auth/me/mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'super_admin' });

    expect(res.status).toBe(400);
  });

  test('PATCH retorna 400 sin mode', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .patch('/api/auth/me/mode')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me exige autenticación', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  test('PATCH /api/auth/me/mode exige autenticación', async () => {
    const res = await request(app).patch('/api/auth/me/mode').send({ mode: 'adulto' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// BK-1.4 — Middleware de autenticación y autorización por rol
// ---------------------------------------------------------------------------
describe('BK-1.4 - Middleware authenticateToken y authorizeRoles', () => {
  /** App auxiliar para poder ejercitar authorizeRoles de forma aislada. */
  const buildRoleProtectedApp = () => {
    const testApp = express();
    testApp.get('/adult-only', authenticateToken, authorizeRoles(['responsable']), (req: any, res) => {
      res.status(200).json({ rol: req.rol });
    });
    testApp.get('/any-role', authenticateToken, (req: any, res) => {
      res.status(200).json({ rol: req.rol });
    });
    return testApp;
  };

  test('token ausente devuelve 401', async () => {
    const res = await request(buildRoleProtectedApp()).get('/any-role');

    expect(res.status).toBe(401);
  });

  test('token inválido devuelve 403', async () => {
    const res = await request(buildRoleProtectedApp())
      .get('/any-role')
      .set('Authorization', 'Bearer token-invalido');

    expect(res.status).toBe(403);
  });

  test('token expirado devuelve 403', async () => {
    const expiredToken = jwt.sign(
      { id: 'uuid', email: 'ana@mail.com', rol: 'responsable' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(buildRoleProtectedApp())
      .get('/any-role')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(403);
  });

  test('token válido puebla req.rol y responde 200', async () => {
    const token = await registerAndLogin();

    const res = await request(buildRoleProtectedApp())
      .get('/any-role')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('responsable');
  });

  test('authorizeRoles permite el acceso al perfil autorizado', async () => {
    const token = await registerAndLogin();

    const res = await request(buildRoleProtectedApp())
      .get('/adult-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('responsable');
  });

  test('authorizeRoles bloquea el acceso con un perfil no autorizado', async () => {
    const token = await registerAndLogin({ email: 'tutor@mail.com', esResponsable: false });

    const res = await request(buildRoleProtectedApp())
      .get('/adult-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  test('el rol viaja en el claim del JWT y no en un campo de texto plano', async () => {
    const token = await registerAndLogin({ email: 'tutor@mail.com', esResponsable: false });

    const payload: any = jwt.decode(token);
    expect(payload.rol).toBe('tutor');
  });
});
