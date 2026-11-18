import request from 'supertest';
import app from '../index';
import { db } from '../config/db';

/** "Ayudanos a mejorar": el adulto envía su opinión desde la app. */

const ADMIN_SECRET = 'secreto-de-pruebas-feedback';
let savedAdminSecret: string | undefined;

const registerAdult = async (email = 'opina@test.com') => {
  const res = await request(app).post('/api/auth/register').send({
    nombre: 'Adulto Responsable',
    email,
    password: 'password123',
    esResponsable: true
  });
  return { token: res.body.token as string, responsibleId: res.body.responsible.id as string };
};

const sendFeedback = (token: string, body: Record<string, unknown>) =>
  request(app).post('/api/feedback').set('Authorization', `Bearer ${token}`).send(body);

beforeAll(() => {
  savedAdminSecret = process.env.ADMIN_SECRET;
  process.env.ADMIN_SECRET = ADMIN_SECRET;
});

afterAll(() => {
  if (savedAdminSecret === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = savedAdminSecret;
});

beforeEach(() => {
  db.responsables = [];
  db.devices = [];
  db.feedback = [];
  db.claimThrottle = {};
});

describe('POST /api/feedback', () => {
  test('201: guarda la opinión recortada con la cuenta y la fecha', async () => {
    const { token, responsibleId } = await registerAdult();

    const res = await sendFeedback(token, { text: '  Me gustaría ver un resumen semanal  ' });

    expect(res.status).toBe(201);
    expect(res.body.feedback).toMatchObject({
      responsibleId,
      text: 'Me gustaría ver un resumen semanal'
    });
    expect(res.body.feedback.id).toBeDefined();
    expect(res.body.feedback.createdAt).toBeDefined();
    expect(db.feedback).toHaveLength(1);
  });

  test('Vacía, en blanco o sin el campo → 400', async () => {
    const { token } = await registerAdult();

    for (const body of [{}, { text: '' }, { text: '    ' }]) {
      const res = await sendFeedback(token, body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Por favor, contanos cómo podríamos mejorar.');
    }
    expect(db.feedback).toHaveLength(0);
  });

  test('Menos de 3 o más de 1000 caracteres → 400; los bordes se aceptan', async () => {
    const { token } = await registerAdult();

    expect((await sendFeedback(token, { text: 'ok' })).status).toBe(400);
    expect((await sendFeedback(token, { text: 'a'.repeat(1001) })).status).toBe(400);
    expect((await sendFeedback(token, { text: 'mmm' })).status).toBe(201);
    expect((await sendFeedback(token, { text: 'a'.repeat(1000) })).status).toBe(201);
  });

  test('Cuenta caracteres, no unidades UTF-16 (emojis)', async () => {
    const { token } = await registerAdult();

    // 1000 emojis son 2000 unidades UTF-16 pero 1000 caracteres.
    expect((await sendFeedback(token, { text: '👍'.repeat(1000) })).status).toBe(201);
  });

  test('Un texto que no es string → 400', async () => {
    const { token } = await registerAdult();

    const res = await sendFeedback(token, { text: 12345 });

    expect(res.status).toBe(400);
  });

  test('Más de 10 opiniones en un día → 429; el límite es por cuenta', async () => {
    const { token } = await registerAdult();

    for (let i = 0; i < 10; i++) {
      expect((await sendFeedback(token, { text: `Opinión número ${i}` })).status).toBe(201);
    }
    expect((await sendFeedback(token, { text: 'Una más' })).status).toBe(429);

    const other = await registerAdult('otra-opina@test.com');
    expect((await sendFeedback(other.token, { text: 'Una más' })).status).toBe(201);
  });

  test('Las de ayer no cuentan para el límite', async () => {
    const { token, responsibleId } = await registerAdult();
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    for (let i = 0; i < 10; i++) {
      db.feedback.push({ id: `viejo-${i}`, responsibleId, text: 'vieja', createdAt: yesterday });
    }

    expect((await sendFeedback(token, { text: 'Nueva opinión' })).status).toBe(201);
  });

  test('Sin sesión → 401; con credencial de celular → 401', async () => {
    const none = await request(app).post('/api/feedback').send({ text: 'Hola equipo' });
    const device = await request(app)
      .post('/api/feedback')
      .set('Authorization', 'Device cualquier-cosa')
      .send({ text: 'Hola equipo' });

    expect(none.status).toBe(401);
    expect(device.status).toBe(401);
    expect(db.feedback).toHaveLength(0);
  });
});

describe('GET /api/feedback (admin)', () => {
  test('Con x-admin-secret → lista las opiniones, más nuevas primero', async () => {
    const { token } = await registerAdult();
    await sendFeedback(token, { text: 'Primera opinión' });
    db.feedback[0].createdAt = new Date(Date.now() - 60000).toISOString();
    await sendFeedback(token, { text: 'Segunda opinión' });

    const res = await request(app).get('/api/feedback').set('x-admin-secret', ADMIN_SECRET);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.feedback.map((f: any) => f.text)).toEqual(['Segunda opinión', 'Primera opinión']);
  });

  test('Sin secreto, con uno incorrecto o con el JWT de un adulto → 401', async () => {
    const { token } = await registerAdult();

    const none = await request(app).get('/api/feedback');
    const wrong = await request(app).get('/api/feedback').set('x-admin-secret', 'incorrecto');
    const adult = await request(app).get('/api/feedback').set('Authorization', `Bearer ${token}`);

    expect(none.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(adult.status).toBe(401);
  });

  test('Sin ADMIN_SECRET configurado → 503', async () => {
    delete process.env.ADMIN_SECRET;
    try {
      const res = await request(app).get('/api/feedback').set('x-admin-secret', ADMIN_SECRET);
      expect(res.status).toBe(503);
    } finally {
      process.env.ADMIN_SECRET = ADMIN_SECRET;
    }
  });
});
