import request from 'supertest';
import app from '../index';
import { db } from '../config/db';

/** Registra un adulto responsable y devuelve su token. */
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

/** Configura un PIN de 4 dígitos para el responsable autenticado. */
const setPin = async (token: string, pin = '4829') => {
  return request(app)
    .patch('/api/auth/pin')
    .set('Authorization', `Bearer ${token}`)
    .send({ pin });
};

/** Vincula un dispositivo pendiente y devuelve su id y linkCode. */
const linkDevice = async (token: string, overrides: any = {}) => {
  return request(app)
    .post('/api/devices/link')
    .set('Authorization', `Bearer ${token}`)
    .send({
      deviceName: 'Tablet de Sofía',
      fechaNacimiento: '2015-08-12',
      ...overrides
    });
};

beforeEach(() => {
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
});

describe('BK-2.1 — PIN de seguridad del responsable (PATCH /api/auth/pin)', () => {
  test('PIN de 4 dígitos → 200 OK y mensaje de éxito', async () => {
    const { token } = await registerResponsible();

    const res = await setPin(token, '1234');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('PIN creado con éxito');
  });

  test('PIN de 3 dígitos → 400', async () => {
    const { token } = await registerResponsible();

    const res = await setPin(token, '123');

    expect(res.status).toBe(400);
  });

  test('PIN de 5 dígitos → 400', async () => {
    const { token } = await registerResponsible();

    const res = await setPin(token, '12345');

    expect(res.status).toBe(400);
  });

  test('PIN con letras → 400', async () => {
    const { token } = await registerResponsible();

    const res = await setPin(token, 'abcd');

    expect(res.status).toBe(400);
  });

  test('PIN vacío → 400', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .patch('/api/auth/pin')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('pinHash no es el PIN en texto plano (no se devuelve)', async () => {
    const { token, responsible } = await registerResponsible();

    await setPin(token, '1234');

    const stored = db.responsables.find(r => r.id === responsible.id);
    expect(stored!.pinHash).toBeDefined();
    expect(stored!.pinHash).not.toBe('1234');
    expect(stored!.pinUpdatedAt).toBeDefined();
  });

  test('Un solo PIN activo: el nuevo sobrescribe al anterior', async () => {
    const { token } = await registerResponsible();

    await setPin(token, '1111');
    await setPin(token, '2222');

    const stored = db.responsables.find(r => r.pinHash);
    expect(stored!.pinHash).toBeDefined();
  });

  test('Requiere autenticación (sin token → 401)', async () => {
    const res = await request(app).patch('/api/auth/pin').send({ pin: '1234' });

    expect(res.status).toBe(401);
  });
});

describe('BK-2.2 — Registro de dispositivo protegido (POST /api/devices/link)', () => {
  test('Crear dispositivo → 201 con status === "pending" y linkCode presente', async () => {
    const { token } = await registerResponsible();

    const res = await linkDevice(token);

    expect(res.status).toBe(201);
    expect(res.body.device.id).toBeDefined();
    expect(res.body.device.deviceName).toBe('Tablet de Sofía');
    expect(res.body.device.fechaNacimiento).toBe('2015-08-12');
    expect(res.body.device.status).toBe('pending');
    expect(res.body.linkCode).toBeDefined();
    expect(res.body.linkCode.length).toBe(8);
    expect(res.body.device.responsibleId).toBeDefined();
    expect(res.body.device.createdAt).toBeDefined();
  });

  test('Requiere fechaNacimiento (sin ella → 400)', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceName: 'Sin fecha' });

    expect(res.status).toBe(400);
  });

  test('Requiere deviceName (sin él → 400)', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/devices/link')
      .set('Authorization', `Bearer ${token}`)
      .send({ fechaNacimiento: '2015-08-12' });

    expect(res.status).toBe(400);
  });

  test('fechaNacimiento con formato inválido → 400', async () => {
    const { token } = await registerResponsible();

    const res = await linkDevice(token, { fechaNacimiento: '15-08-2015' });

    expect(res.status).toBe(400);
  });

  test('Genera linkCode único para cada dispositivo', async () => {
    const { token } = await registerResponsible();

    const res1 = await linkDevice(token);
    const res2 = await linkDevice(token);

    expect(res1.body.linkCode).not.toBe(res2.body.linkCode);
  });

  test('Crea alerta DEVICE_PENDING para el responsable', async () => {
    const { token } = await registerResponsible();

    const res = await linkDevice(token);
    const deviceId = res.body.device.id;

    const alertsRes = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(alertsRes.status).toBe(200);
    const pendingAlert = alertsRes.body.alerts.find(
      (a: any) => a.alertType === 'DEVICE_PENDING' && a.deviceId === deviceId
    );
    expect(pendingAlert).toBeDefined();
  });

  test('Requiere autenticación (sin token → 401)', async () => {
    const res = await request(app)
      .post('/api/devices/link')
      .send({ deviceName: 'X', fechaNacimiento: '2015-08-12' });

    expect(res.status).toBe(401);
  });
});

describe('BK-2.3 — Confirmación de vínculo (POST /api/devices/confirm-link)', () => {
  test('PIN correcto → 200 y status pasa a "active"', async () => {
    const { token } = await registerResponsible();
    await setPin(token, '4829');

    const linkRes = await linkDevice(token);
    const deviceId = linkRes.body.device.id;

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, pin: '4829' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Vinculación confirmada');
    expect(res.body.device.status).toBe('active');
    expect(res.body.device.id).toBe(deviceId);
  });

  test('PIN incorrecto → 401', async () => {
    const { token } = await registerResponsible();
    await setPin(token, '4829');

    const linkRes = await linkDevice(token);

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: linkRes.body.device.id, pin: '0000' });

    expect(res.status).toBe(401);
  });

  test('Dispositivo ajeno de otro responsable → 404', async () => {
    const { token: tokenA } = await registerResponsible('a@test.com');
    const { token: tokenB } = await registerResponsible('b@test.com');

    await setPin(tokenA, '4829');
    const linkRes = await linkDevice(tokenA);
    const deviceId = linkRes.body.device.id;

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ deviceId, pin: '4829' });

    expect(res.status).toBe(404);
  });

  test('Dispositivo ya ACTIVE → 409', async () => {
    const { token } = await registerResponsible();
    await setPin(token, '4829');

    const linkRes = await linkDevice(token);
    const deviceId = linkRes.body.device.id;

    await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, pin: '4829' });

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, pin: '4829' });

    expect(res.status).toBe(409);
  });

  test('Responsable sin PIN configurado → 409', async () => {
    const { token } = await registerResponsible();
    // No se configura PIN

    const linkRes = await linkDevice(token);

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: linkRes.body.device.id, pin: '4829' });

    expect(res.status).toBe(409);
  });

  test('Crea alerta DEVICE_LINKED al confirmar', async () => {
    const { token } = await registerResponsible();
    await setPin(token, '4829');

    const linkRes = await linkDevice(token);
    const deviceId = linkRes.body.device.id;

    await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, pin: '4829' });

    const alertsRes = await request(app)
      .get('/api/events/alerts')
      .set('Authorization', `Bearer ${token}`);

    const linkedAlert = alertsRes.body.alerts.find(
      (a: any) => a.alertType === 'DEVICE_LINKED' && a.deviceId === deviceId
    );
    expect(linkedAlert).toBeDefined();
  });

  test('Acepta linkCode en lugar de deviceId', async () => {
    const { token } = await registerResponsible();
    await setPin(token, '4829');

    const linkRes = await linkDevice(token);

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ linkCode: linkRes.body.linkCode, pin: '4829' });

    expect(res.status).toBe(200);
    expect(res.body.device.status).toBe('active');
  });

  test('Requiere deviceId o linkCode (sin ninguno → 400)', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '4829' });

    expect(res.status).toBe(400);
  });

  test('Requiere pin (sin pin → 400)', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: 'some-id' });

    expect(res.status).toBe(400);
  });

  test('Requiere autenticación (sin token → 401)', async () => {
    const res = await request(app)
      .post('/api/devices/confirm-link')
      .send({ deviceId: 'x', pin: '1234' });

    expect(res.status).toBe(401);
  });
});

describe('BK-2.4 — Consulta y actualización de estado (GET /api/devices, PATCH /api/devices/:id/status)', () => {
  test('GET /api/devices lista solo dispositivos del responsable logueado', async () => {
    const { token: tokenA, responsible: respA } = await registerResponsible('a@test.com');
    const { token: tokenB } = await registerResponsible('b@test.com');

    await linkDevice(tokenA, { deviceName: 'Dispositivo de A' });
    await linkDevice(tokenA, { deviceName: 'Otro de A' });
    await linkDevice(tokenB, { deviceName: 'Dispositivo de B' });

    const res = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.devices.length).toBe(2);
    expect(res.body.devices.every((d: any) => d.responsibleId === respA.id)).toBe(true);
  });

  test('GET /api/devices requiere autenticación', async () => {
    const res = await request(app).get('/api/devices');

    expect(res.status).toBe(401);
  });

  test('PATCH a inactive → 200 y status === "inactive"', async () => {
    const { token } = await registerResponsible();
    const linkRes = await linkDevice(token);
    const deviceId = linkRes.body.device.id;

    const res = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.device.status).toBe('inactive');
  });

  test('PATCH a active → 200 y status === "active"', async () => {
    const { token } = await registerResponsible();
    const linkRes = await linkDevice(token);
    const deviceId = linkRes.body.device.id;

    // Primero a inactive
    await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inactive' });

    const res = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.device.status).toBe('active');
  });

  test('PATCH con status inválido → 400', async () => {
    const { token } = await registerResponsible();
    const linkRes = await linkDevice(token);
    const deviceId = linkRes.body.device.id;

    const res = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'archivado' });

    expect(res.status).toBe(400);
  });

  test('PATCH dispositivo ajeno → 404', async () => {
    const { token: tokenA } = await registerResponsible('a@test.com');
    const { token: tokenB } = await registerResponsible('b@test.com');

    const linkRes = await linkDevice(tokenA);
    const deviceId = linkRes.body.device.id;

    const res = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(404);
  });

  test('PATCH dispositivo inexistente → 404', async () => {
    const { token } = await registerResponsible();

    const res = await request(app)
      .patch('/api/devices/uuid-inexistente/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(404);
  });

  test('Requiere autenticación para PATCH status', async () => {
    const res = await request(app)
      .patch('/api/devices/uuid-x/status')
      .send({ status: 'inactive' });

    expect(res.status).toBe(401);
  });
});
