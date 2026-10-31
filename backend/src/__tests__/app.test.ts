import request from 'supertest';
import app from '../index';
import { db } from '../config/db';

beforeEach(() => {
  // Reset in-memory database between tests
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.blocklist = [
    {
      id: 'lotba-1',
      domain: 'apuestasilegalesba.com',
      type: 'LOTBA_OFFICIAL',
      categoria: 'Apuestas',
      period: '2026-10',
      updatedAt: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z'
    },
  ];
  db.blocklistSyncLog = [];
});

describe('BA Protege+ API Integration Tests', () => {
  let token: string;
  let deviceId: string;

  test('GET /health should return OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('POST /api/auth/register should register a responsible and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre@test.com',
        password: 'password123',
        name: 'Carlos Padre'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.responsible.email).toBe('padre@test.com');
  });

  test('POST /api/auth/login should login successfully', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre@test.com',
        password: 'password123',
        name: 'Carlos Padre'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'padre@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('POST /api/devices/link should create a PENDING device with linkCode', async () => {
    // Register & Login
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre2@test.com',
        password: 'password123',
        name: 'Maria Madre'
      });
    token = regRes.body.token;

    const res = await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceName: 'Celular Juan',
        fechaNacimiento: '2015-08-12',
        deviceToken: 'token-fcm-123'
      });

    expect(res.status).toBe(201);
    expect(res.body.device.id).toBeDefined();
    expect(res.body.device.status).toBe('pending');
    expect(res.body.linkCode).toBeDefined();
    expect(res.body.linkCode.length).toBe(8);
    deviceId = res.body.device.id;

    // Check alerts
    const alertsRes = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.alerts.length).toBe(1);
    expect(alertsRes.body.alerts[0].alertType).toBe('DEVICE_PENDING');
  });

  test('POST /api/devices/link requires fechaNacimiento', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre4@test.com',
        password: 'password123',
        name: 'Luis Padre'
      });
    const t = regRes.body.token;

    const res = await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${t}`)
      .send({
        deviceName: 'Sin fecha'
      });

    expect(res.status).toBe(400);
  });

  test('PATCH /api/auth/pin should set a 4-digit PIN and reject invalid ones', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre5@test.com',
        password: 'password123',
        name: 'Ana Padre'
      });
    const t = regRes.body.token;

    // PIN válido de 4 dígitos
    const okRes = await request(app)
      .patch('/api/auth/pin')
      .set('Authorization', `Bearer ${t}`)
      .send({ pin: '4829' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.message).toBe('PIN creado con éxito');

    // PIN de 3 dígitos → 400
    const shortRes = await request(app)
      .patch('/api/auth/pin')
      .set('Authorization', `Bearer ${t}`)
      .send({ pin: '123' });
    expect(shortRes.status).toBe(400);

    // PIN con letras → 400
    const letterRes = await request(app)
      .patch('/api/auth/pin')
      .set('Authorization', `Bearer ${t}`)
      .send({ pin: 'abcd' });
    expect(letterRes.status).toBe(400);
  });

  test('POST /api/devices/confirm-link should activate a device with valid PIN', async () => {
    // Register & set PIN
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre6@test.com',
        password: 'password123',
        name: 'Sofi Madre'
      });
    const t = regRes.body.token;

    await request(app)
      .patch('/api/auth/pin')
      .set('Authorization', `Bearer ${t}`)
      .send({ pin: '4829' });

    // Link device
    const linkRes = await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${t}`)
      .send({
        deviceName: 'Tablet Sofía',
        fechaNacimiento: '2015-08-12'
      });
    const deviceId = linkRes.body.device.id;

    // Confirm with correct PIN
    const confirmRes = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${t}`)
      .send({ deviceId, pin: '4829' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.message).toBe('Vinculación confirmada');
    expect(confirmRes.body.device.status).toBe('active');

    // Confirm again → 409 already active
    const againRes = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${t}`)
      .send({ deviceId, pin: '4829' });
    expect(againRes.status).toBe(409);

    // Wrong PIN → 401 (en dispositivo aún pendiente, no confirmado)
    const wrongLinkRes = await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${t}`)
      .send({
        deviceName: 'Tablet Mala',
        fechaNacimiento: '2016-01-01'
      });
    const wrongRes = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${t}`)
      .send({ deviceId: wrongLinkRes.body.device.id, pin: '0000' });
    expect(wrongRes.status).toBe(401);
  });

  test('GET /api/devices should list only devices of the logged responsible', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre7@test.com',
        password: 'password123',
        name: 'Rosa Madre'
      });
    const t = regRes.body.token;

    await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${t}`)
      .send({
        deviceName: 'Dispositivo 1',
        fechaNacimiento: '2015-08-12'
      });

    await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${t}`)
      .send({
        deviceName: 'Dispositivo 2',
        fechaNacimiento: '2016-01-01'
      });

    const listRes = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${t}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.devices.length).toBe(2);
    expect(listRes.body.devices.every((d: any) => d.responsibleId === regRes.body.responsible.id)).toBe(true);
  });

  test('PATCH /api/devices/:id/status should toggle active/inactive', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre8@test.com',
        password: 'password123',
        name: 'Toni Padre'
      });
    const t = regRes.body.token;

    const linkRes = await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${t}`)
      .send({
        deviceName: 'Dispositivo X',
        fechaNacimiento: '2015-08-12'
      });
    const deviceId = linkRes.body.device.id;

    // Set inactive
    const inactRes = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${t}`)
      .send({ status: 'inactive' });
    expect(inactRes.status).toBe(200);
    expect(inactRes.body.device.status).toBe('inactive');

    // Set active
    const actRes = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${t}`)
      .send({ status: 'active' });
    expect(actRes.status).toBe(200);
    expect(actRes.body.device.status).toBe('active');

    // Invalid status → 400
    const badRes = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${t}`)
      .send({ status: 'valido' });
    expect(badRes.status).toBe(400);
  });

  test('POST /api/blocklist/check should detect blocked LOTBA domains', async () => {
    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'https://apuestasilegalesba.com/juego' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);
    expect(res.body.matchType).toBe('LOTBA_OFFICIAL');
  });

  test('POST /api/blocklist/custom and GET /api/blocklist should manage custom blocklist', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'padre3@test.com',
        password: 'password123',
        name: 'Ana Madre'
      });
    token = regRes.body.token;

    const addRes = await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'sitiodudoso.com' });

    expect(addRes.status).toBe(201);
    expect(addRes.body.item.type).toBe('CUSTOM');

    const getRes = await request(app)
      .get('/api/blocklist')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.blocklist.length).toBe(2); // 1 official + 1 custom
  });
});
