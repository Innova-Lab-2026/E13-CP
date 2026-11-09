import request from 'supertest';
import app from '../index';
import { db } from '../config/db';

/** Registra un adulto responsable y devuelve su token y perfil. */
const registerResponsible = async (email = 'responsable@test.com') => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      nombre: 'Adulto Responsable',
      email,
      password: 'password123',
      telefono: '+5491122334455',
      esResponsable: true
    });
  return { token: res.body.token as string, responsible: res.body.responsible };
};

/** Vincula un dispositivo y devuelve su id. */
const linkDevice = async (token: string, deviceName = 'Dispositivo Test') => {
  const res = await request(app)
    .post('/api/devices/link')
    .set('Authorization', `Bearer ${token}`)
    .send({
      deviceName,
      fechaNacimiento: '2015-08-12'
    });
  return res.body.device.id;
};

beforeEach(() => {
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.blocklist = [];
  db.blocklistSyncLog = [];
});

describe('T9 — POST /api/blocklist/check (filtrado DNS/VPN)', () => {
  test('Dominio en seed oficial → isBlocked: true, matchType: LOTBA_OFFICIAL', async () => {
    // Seed the official blocklist (simulating what the constructor does)
    db.blocklist.push({
      id: 'lotba-1',
      domain: 'apuestasilegalesba.com',
      type: 'LOTBA_OFFICIAL',
      categoria: 'Apuestas',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'apuestasilegalesba.com' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);
    expect(res.body.blocked).toBe(true);
    expect(res.body.matchType).toBe('LOTBA_OFFICIAL');
    expect(res.body.categoria).toBe('Apuestas');
  });

  test('Dominio dentro de una URL completa se detecta (subcadena)', async () => {
    db.blocklist.push({
      id: 'lotba-1',
      domain: 'apuestasilegalesba.com',
      type: 'LOTBA_OFFICIAL',
      categoria: 'Apuestas',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'https://www.apuestasilegalesba.com/juego?x=1' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);
  });

  test('Comparación case-insensitive', async () => {
    db.blocklist.push({
      id: 'lotba-1',
      domain: 'apuestasilegalesba.com',
      type: 'LOTBA_OFFICIAL',
      categoria: 'Apuestas',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: '  APUESTASILEGALESBA.COM  ' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);
    expect(res.body.domain).toBe('apuestasilegalesba.com');
  });

  test('Dominio no listado → isBlocked: false', async () => {
    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'sitio-limpio.com' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(false);
    expect(res.body.blocked).toBe(false);
    expect(res.body.matchType).toBeNull();
  });

  test('Dominio custom agregado por responsable → isBlocked: true, matchType: CUSTOM', async () => {
    const { token } = await registerResponsible();

    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'mi-sitio-custom.com' });

    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'mi-sitio-custom.com' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);
    expect(res.body.matchType).toBe('CUSTOM');
  });

  test('Ruta pública: no requiere JWT', async () => {
    db.blocklist.push({
      id: 'lotba-1',
      domain: 'apuestasilegalesba.com',
      type: 'LOTBA_OFFICIAL',
      categoria: 'Apuestas',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'apuestasilegalesba.com' });

    expect(res.status).toBe(200);
  });

  test('Requiere dominio en el body', async () => {
    const res = await request(app)
      .post('/api/blocklist/check')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('T10 — POST /api/events (registro de eventos y alertas)', () => {
  test('Evento SITE_BLOCKED → 201 y se crea alerta vinculada al responsable', async () => {
    const { token, responsible } = await registerResponsible();
    const deviceId = await linkDevice(token);

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId,
        eventType: 'SITE_BLOCKED',
        domain: 'apuestasilegalesba.com',
        details: 'Intento de navegación bloqueado'
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Event recorded successfully');
    expect(res.body.event.eventType).toBe('SITE_BLOCKED');
    expect(res.body.event.deviceId).toBe(deviceId);
    expect(res.body.event.timestamp).toBeDefined();

    // Verificar que se creó la alerta
    const alertsRes = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(alertsRes.status).toBe(200);
    const siteBlockedAlert = alertsRes.body.alerts.find(
      (a: any) => a.alertType === 'SITE_BLOCKED' && a.deviceId === deviceId
    );
    expect(siteBlockedAlert).toBeDefined();
    expect(siteBlockedAlert.read).toBe(false);
    expect(siteBlockedAlert.responsibleId).toBe(responsible.id);
  });

  test('Evento UNINSTALL_ATTEMPT → 201 y se crea alerta crítica', async () => {
    const { token } = await registerResponsible();
    const deviceId = await linkDevice(token);

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId,
        eventType: 'UNINSTALL_ATTEMPT',
        details: 'Intento de desinstalación de la app de protección'
      });

    expect(res.status).toBe(201);
    expect(res.body.event.eventType).toBe('UNINSTALL_ATTEMPT');

    const alertsRes = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${token}`);

    const uninstallAlert = alertsRes.body.alerts.find(
      (a: any) => a.alertType === 'UNINSTALL_ATTEMPT'
    );
    expect(uninstallAlert).toBeDefined();
  });

  test('Evento tipo inválido → 400', async () => {
    const { token } = await registerResponsible();
    const deviceId = await linkDevice(token);

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId,
        eventType: 'INVALID_TYPE',
        details: 'test'
      });

    expect(res.status).toBe(400);
  });

  test('Dispositivo inexistente → 404', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId: 'uuid-inexistente',
        eventType: 'SITE_BLOCKED',
        details: 'test'
      });

    expect(res.status).toBe(404);
  });

  test('Campos obligatorios faltantes → 400', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: 'abc' });

    expect(res.status).toBe(400);
  });
});

describe('T11 — POST /api/devices/push-token (registro de push token)', () => {
  test('Registrar pushToken → 201', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/devices/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({
        pushToken: 'ExponentPushToken[xxxx-yyyy-zzzz]'
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Push token registered successfully');

    // Verificar que se guardó en el responsable
    const stored = db.responsables.find(r => r.pushToken === 'ExponentPushToken[xxxx-yyyy-zzzz]');
    expect(stored).toBeDefined();
  });

  test('pushToken faltante → 400', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/devices/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('Requiere autenticación', async () => {
    const res = await request(app)
      .post('/api/devices/push-token')
      .send({ pushToken: 'ExponentPushToken[test]' });

    expect(res.status).toBe(401);
  });
});

describe('T12 — GET /api/events, GET /api/alerts, PATCH /api/alerts/:id/read', () => {
  test('GET /api/events devuelve eventos ordenados descendente por timestamp', async () => {
    const { token } = await registerResponsible();
    const deviceId = await linkDevice(token);

    // Crear dos eventos con pequeña diferencia de tiempo
    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId,
        eventType: 'ACCESS_ATTEMPT',
        details: 'Evento 1'
      });

    await new Promise(r => setTimeout(r, 10));

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId,
        eventType: 'SITE_BLOCKED',
        details: 'Evento 2'
      });

    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBe(2);
    // El más reciente primero
    expect(res.body.events[0].details).toBe('Evento 2');
    expect(res.body.events[1].details).toBe('Evento 1');
  });

  test('GET /api/events filtra por deviceId', async () => {
    const { token } = await registerResponsible();
    const deviceId1 = await linkDevice(token, 'Dispositivo 1');
    const deviceId2 = await linkDevice(token, 'Dispositivo 2');

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: deviceId1, eventType: 'SITE_BLOCKED', details: 'Evento D1' });

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: deviceId2, eventType: 'SITE_BLOCKED', details: 'Evento D2' });

    const res = await request(app)
      .get(`/api/events?deviceId=${deviceId1}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].details).toBe('Evento D1');
  });

  test('GET /api/events filtra por category (eventType)', async () => {
    const { token } = await registerResponsible();
    const deviceId = await linkDevice(token);

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, eventType: 'SITE_BLOCKED', details: 'Bloqueo' });

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, eventType: 'APP_INSTALL_ATTEMPT', details: 'Instalación' });

    const res = await request(app)
      .get('/api/events?category=SITE_BLOCKED')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].eventType).toBe('SITE_BLOCKED');
  });

  test('GET /api/events solo devuelve dispositivos del responsable autenticado', async () => {
    const { token: tokenA } = await registerResponsible('a@test.com');
    const { token: tokenB } = await registerResponsible('b@test.com');

    const deviceIdA = await linkDevice(tokenA, 'Dispositivo A');
    const deviceIdB = await linkDevice(tokenB, 'Dispositivo B');

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ deviceId: deviceIdA, eventType: 'SITE_BLOCKED', details: 'Evento A' });

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ deviceId: deviceIdB, eventType: 'SITE_BLOCKED', details: 'Evento B' });

    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].details).toBe('Evento A');
  });

  test('GET /api/alerts devuelve solo alertas del responsable autenticado', async () => {
    const { token: tokenA, responsible: respA } = await registerResponsible('a@test.com');
    const { token: tokenB } = await registerResponsible('b@test.com');

    const deviceIdA = await linkDevice(tokenA, 'Dispositivo A');
    const deviceIdB = await linkDevice(tokenB, 'Dispositivo B');

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ deviceId: deviceIdA, eventType: 'SITE_BLOCKED', details: 'Alerta A' });

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ deviceId: deviceIdB, eventType: 'SITE_BLOCKED', details: 'Alerta B' });

    const res = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    // linkDevice crea DEVICE_PENDING + el evento crea SITE_BLOCKED = 2 alertas para A
    expect(res.body.alerts.length).toBe(2);
    expect(res.body.alerts.every((a: any) => a.responsibleId === respA.id)).toBe(true);
    expect(res.body.alerts.some((a: any) => a.alertType === 'SITE_BLOCKED')).toBe(true);
    expect(res.body.alerts.some((a: any) => a.alertType === 'DEVICE_PENDING')).toBe(true);
  });

  test('PATCH /api/alerts/:id/read marca read: true', async () => {
    const { token } = await registerResponsible();
    const deviceId = await linkDevice(token);

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, eventType: 'SITE_BLOCKED', details: 'Alerta para leer' });

    const alertsRes = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${token}`);

    const alertId = alertsRes.body.alerts[0].id;

    const patchRes = await request(app)
      .patch(`/api/events/alerts/${alertId}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.alert.read).toBe(true);
  });

  test('PATCH /api/alerts/:id/read alerta ajena → 404', async () => {
    const { token: tokenA } = await registerResponsible('a@test.com');
    const { token: tokenB } = await registerResponsible('b@test.com');

    const deviceIdA = await linkDevice(tokenA, 'Dispositivo A');

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ deviceId: deviceIdA, eventType: 'SITE_BLOCKED', details: 'Alerta de A' });

    const alertsResA = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${tokenA}`);

    const alertId = alertsResA.body.alerts[0].id;

    // Intento de B para marcar la alerta de A
    const res = await request(app)
      .patch(`/api/events/alerts/${alertId}/read`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  test('GET /api/events requiere autenticación', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });

  test('GET /api/alerts requiere autenticación', async () => {
    const res = await request(app).get('/api/events/alerts');
    expect(res.status).toBe(401);
  });
});

describe('T13 — CRUD blocklist (verificación de existencia)', () => {
  test('GET /api/blocklist combina LOTBA_OFFICIAL + CUSTOM del responsable', async () => {
    const { token } = await registerResponsible();

    // Agregar un dominio oficial seed
    db.blocklist.push({
      id: 'lotba-1',
      domain: 'apuestasilegalesba.com',
      type: 'LOTBA_OFFICIAL',
      categoria: 'Apuestas',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'sitio-custom.com' });

    const res = await request(app)
      .get('/api/blocklist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.blocklist.length).toBe(2);
    expect(res.body.blocklist.some((i: any) => i.type === 'LOTBA_OFFICIAL')).toBe(true);
    expect(res.body.blocklist.some((i: any) => i.type === 'CUSTOM')).toBe(true);
  });

  test('POST /api/blocklist/custom dominio duplicado → 400', async () => {
    const { token } = await registerResponsible();

    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'duplicado.com' });

    const res = await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'duplicado.com' });

    expect(res.status).toBe(400);
  });

  test('DELETE /api/blocklist/custom/:id borra custom propio → 200', async () => {
    const { token } = await registerResponsible();

    const created = await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'borrar-me.com' });

    const res = await request(app)
      .delete(`/api/blocklist/custom/${created.body.item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.item.domain).toBe('borrar-me.com');
  });

  test('DELETE /api/blocklist/custom/:id no permite borrar oficial LOTBA → 404', async () => {
    const { token } = await registerResponsible();

    db.blocklist.push({
      id: 'lotba-1',
      domain: 'apuestasilegalesba.com',
      type: 'LOTBA_OFFICIAL',
      categoria: 'Apuestas',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .delete('/api/blocklist/custom/lotba-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
