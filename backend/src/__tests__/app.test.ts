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

  test('POST /api/devices/link should link a device and generate alert', async () => {
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
        deviceToken: 'token-fcm-123'
      });

    expect(res.status).toBe(201);
    expect(res.body.device.id).toBeDefined();
    deviceId = res.body.device.id;

    // Check alerts
    const alertsRes = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.alerts.length).toBe(1);
    expect(alertsRes.body.alerts[0].alertType).toBe('DEVICE_LINKED');
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
