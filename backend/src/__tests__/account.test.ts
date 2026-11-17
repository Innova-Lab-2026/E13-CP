import request from 'supertest';
import app from '../index';
import { db } from '../config/db';

const ADULT = {
  name: 'Laura Responsable',
  email: 'laura@test.com',
  password: 'password123'
};

async function registerAdult(): Promise<string> {
  const res = await request(app).post('/api/auth/register').send(ADULT);
  return res.body.token as string;
}

beforeEach(() => {
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.blocklist = db.blocklist.filter(item => item.type === 'LOTBA_OFFICIAL');
});

describe('Perfil: hasPin', () => {
  test('el perfil indica si el adulto configuró el PIN sin exponer el hash', async () => {
    const token = await registerAdult();

    const before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(before.body.hasPin).toBe(false);
    expect(before.body.pinHash).toBeUndefined();

    await request(app).patch('/api/auth/pin').set('Authorization', `Bearer ${token}`).send({ pin: '1234' });

    const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(after.body.hasPin).toBe(true);
    expect(after.body.pinHash).toBeUndefined();
  });
});

describe('POST /api/auth/pin/verify', () => {
  test('responde 200 con el PIN correcto y 401 con uno incorrecto', async () => {
    const token = await registerAdult();
    await request(app).patch('/api/auth/pin').set('Authorization', `Bearer ${token}`).send({ pin: '4829' });

    const ok = await request(app)
      .post('/api/auth/pin/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '4829' });
    expect(ok.status).toBe(200);
    expect(ok.body.valid).toBe(true);

    const wrong = await request(app)
      .post('/api/auth/pin/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '0000' });
    expect(wrong.status).toBe(401);
  });

  test('responde 409 si todavía no hay PIN y 400 si el formato es inválido', async () => {
    const token = await registerAdult();

    const noPin = await request(app)
      .post('/api/auth/pin/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '1234' });
    expect(noPin.status).toBe(409);

    const badFormat = await request(app)
      .post('/api/auth/pin/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '12a4' });
    expect(badFormat.status).toBe(400);
  });
});

describe('PATCH /api/auth/me', () => {
  test('actualiza nombre y teléfono', async () => {
    const token = await registerAdult();

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Laura Gómez', telefono: '11 5555-1234' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Laura Gómez');
    expect(res.body.telefono).toBe('11 5555-1234');
  });

  test('rechaza un cuerpo vacío o un teléfono inválido', async () => {
    const token = await registerAdult();

    const empty = await request(app).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({});
    expect(empty.status).toBe(400);

    const badPhone = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ telefono: 'abc' });
    expect(badPhone.status).toBe(400);
  });
});

describe('DELETE /api/auth/me', () => {
  test('exige la contraseña correcta', async () => {
    const token = await registerAdult();

    const missing = await request(app).delete('/api/auth/me').set('Authorization', `Bearer ${token}`).send({});
    expect(missing.status).toBe(400);

    const wrong = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'incorrecta' });
    expect(wrong.status).toBe(401);
    expect(db.responsables).toHaveLength(1);
  });

  test('elimina la cuenta con sus dispositivos, alertas y dominios personalizados', async () => {
    const token = await registerAdult();

    await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceName: 'Tablet de Sofía', fechaNacimiento: '2015-08-12' });
    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'sitio-personalizado.com' });

    expect(db.devices).toHaveLength(1);
    expect(db.alerts.length).toBeGreaterThan(0);

    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: ADULT.password });

    expect(res.status).toBe(200);
    expect(db.responsables).toHaveLength(0);
    expect(db.devices).toHaveLength(0);
    expect(db.alerts).toHaveLength(0);
    expect(db.blocklist.some(item => item.type === 'CUSTOM')).toBe(false);

    const login = await request(app).post('/api/auth/login').send(ADULT);
    expect(login.status).toBe(401);
  });
});
