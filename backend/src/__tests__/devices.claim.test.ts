import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import request from 'supertest';
import app, { trustProxySetting } from '../index';
import { db } from '../config/db';
import { checkResponsiblePin } from '../services/device.service';

// Como detrás del proxy de Vercel: las pruebas cambian de IP con X-Forwarded-For.
// Sin VERCEL ni TRUST_PROXY ese header se ignora (ver "trust proxy" abajo).
app.set('trust proxy', 1);

/**
 * Vinculación por código: el adulto genera un código y el celular del menor se
 * vincula con ese código y el PIN, sin que el adulto inicie sesión ahí. Después
 * el celular usa su propia credencial ("Authorization: Device ...").
 */

const PIN = '4829';
const GENERIC_ERROR = 'El código o el PIN no son correctos, o el código venció.';

/** Registra un adulto, le configura el PIN y devuelve su token. */
const registerAdult = async (email = 'adulto@test.com', pin: string | null = PIN) => {
  const res = await request(app).post('/api/auth/register').send({
    nombre: 'Adulto Responsable',
    email,
    password: 'password123',
    telefono: '+5491122334455',
    esResponsable: true
  });
  const token = res.body.token as string;
  if (pin) {
    await request(app).patch('/api/auth/pin').set('Authorization', `Bearer ${token}`).send({ pin });
  }
  return { token, responsibleId: res.body.responsible.id as string };
};

/** Crea un dispositivo pendiente y devuelve su id y código. */
const createDevice = async (token: string, overrides: Record<string, unknown> = {}) => {
  const res = await request(app)
    .post('/api/devices/link')
    .set('Authorization', `Bearer ${token}`)
    .send({ deviceName: 'Celular de Sofi', fechaNacimiento: '2014-03-20', ...overrides });
  return {
    res,
    deviceId: res.body.device?.id as string,
    linkCode: res.body.linkCode as string
  };
};

const claim = (linkCode: unknown, pin: unknown, ip?: string) => {
  const req = request(app).post('/api/devices/claim');
  if (ip) req.set('X-Forwarded-For', ip);
  return req.send({ linkCode, pin });
};

/** Adulto con PIN + dispositivo vinculado por código; devuelve la credencial del celular. */
const linkedDevice = async () => {
  const adult = await registerAdult();
  const { deviceId, linkCode } = await createDevice(adult.token);
  const res = await claim(linkCode, PIN);
  return { ...adult, deviceId, linkCode, deviceAccessToken: res.body.deviceAccessToken as string };
};

const asDevice = (token: string) => `Device ${token}`;
const findDevice = (id: string) => db.devices.find(d => d.id === id)!;

let savedTtl: string | undefined;

beforeEach(() => {
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.claimThrottle = {};
  db.blocklist = db.blocklist.filter(item => item.type === 'LOTBA_OFFICIAL');
  savedTtl = process.env.LINK_CODE_TTL_MINUTES;
  delete process.env.LINK_CODE_TTL_MINUTES;
});

afterEach(() => {
  if (savedTtl === undefined) delete process.env.LINK_CODE_TTL_MINUTES;
  else process.env.LINK_CODE_TTL_MINUTES = savedTtl;
});

describe('POST /api/devices/link: nombre y vencimiento del código', () => {
  test('Nombre de 1 carácter → 400 con mensaje claro', async () => {
    const { token } = await registerAdult();
    const { res } = await createDevice(token, { deviceName: ' X ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El nombre tiene que tener entre 2 y 40 caracteres');
  });

  test('Nombre de más de 40 caracteres → 400', async () => {
    const { token } = await registerAdult();
    const { res } = await createDevice(token, { deviceName: 'A'.repeat(41) });

    expect(res.status).toBe(400);
  });

  test('Nombre de 2 caracteres → 201', async () => {
    const { token } = await registerAdult();
    const { res } = await createDevice(token, { deviceName: 'Jo' });

    expect(res.status).toBe(201);
  });

  test('La respuesta trae el código con vencimiento de 24 h por defecto', async () => {
    const { token } = await registerAdult();
    const before = Date.now();
    const { res } = await createDevice(token);

    expect(res.status).toBe(201);
    expect(res.body.linkCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(res.body.device.linkCode).toBe(res.body.linkCode);
    const expiresAt = Date.parse(res.body.linkCodeExpiresAt);
    expect(expiresAt - before).toBeGreaterThanOrEqual(1440 * 60000 - 1000);
    expect(expiresAt - before).toBeLessThanOrEqual(1440 * 60000 + 5000);
    expect(res.body.device.linkCodeExpiresAt).toBe(res.body.linkCodeExpiresAt);
  });

  test('LINK_CODE_TTL_MINUTES cambia la vigencia', async () => {
    process.env.LINK_CODE_TTL_MINUTES = '60';
    const { token } = await registerAdult();
    const before = Date.now();
    const { res } = await createDevice(token);

    const expiresAt = Date.parse(res.body.linkCodeExpiresAt);
    expect(expiresAt - before).toBeGreaterThanOrEqual(60 * 60000 - 1000);
    expect(expiresAt - before).toBeLessThanOrEqual(60 * 60000 + 5000);
  });

  test('Las respuestas nunca exponen deviceToken, deviceSecretHash ni linkFailedAttempts', async () => {
    const { token } = await registerAdult();
    const { res, linkCode } = await createDevice(token, { deviceToken: 'fcm-secreto' });
    expect(res.body.device.deviceToken).toBeUndefined();

    await claim(linkCode, PIN);

    const list = await request(app).get('/api/devices').set('Authorization', `Bearer ${token}`);
    const [device] = list.body.devices;
    expect(device.status).toBe('active');
    expect(device.linkedAt).toBeDefined();
    expect(device.deviceSecretHash).toBeUndefined();
    expect(device.deviceSecretIssuedAt).toBeUndefined();
    expect(device.linkFailedAttempts).toBeUndefined();
    expect(device.deviceToken).toBeUndefined();
    // Ya vinculado: el código no se muestra más.
    expect(device.linkCode).toBeUndefined();
    expect(device.linkCodeExpiresAt).toBeUndefined();
  });
});

describe('POST /api/devices/claim', () => {
  test('Código + PIN correctos → 200, credencial y dispositivo activo', async () => {
    const { token } = await registerAdult();
    const { deviceId, linkCode } = await createDevice(token);

    const res = await claim(linkCode, PIN);

    expect(res.status).toBe(200);
    expect(typeof res.body.deviceAccessToken).toBe('string');
    expect(res.body.deviceAccessToken.length).toBeGreaterThanOrEqual(40);
    expect(res.body.device).toMatchObject({
      id: deviceId,
      deviceName: 'Celular de Sofi',
      status: 'active'
    });
    // Nunca datos del adulto, el código ni la fecha de nacimiento.
    expect(res.body.device.responsibleId).toBeUndefined();
    expect(res.body.device.linkCode).toBeUndefined();
    expect(res.body.device.fechaNacimiento).toBeUndefined();
    expect(res.body.responsibleId).toBeUndefined();
    expect(res.body.linkCode).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(linkCode);
    expect(JSON.stringify(res.body)).not.toContain('2014-03-20');

    const stored = findDevice(deviceId);
    expect(stored.status).toBe('active');
    expect(stored.linkedAt).toBeDefined();
    expect(stored.linkCodeUsedAt).toBeDefined();
    // Se guarda solo el hash de la credencial.
    expect(stored.deviceSecretHash).toBe(
      crypto.createHash('sha256').update(res.body.deviceAccessToken).digest('hex')
    );
    expect(JSON.stringify(stored)).not.toContain(res.body.deviceAccessToken);

    const linkedAlert = db.alerts.find(a => a.deviceId === deviceId && a.alertType === 'DEVICE_LINKED');
    expect(linkedAlert).toBeDefined();
  });

  test('Acepta el código en minúsculas, con espacios o guiones', async () => {
    const { token } = await registerAdult();
    const { linkCode } = await createDevice(token);
    const typed = `${linkCode.slice(0, 4).toLowerCase()}- ${linkCode.slice(4).toLowerCase()}`;

    const res = await claim(typed, PIN);

    expect(res.status).toBe(200);
  });

  test('Código con formato inválido → 400', async () => {
    const res = await claim('ABC1', PIN);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Revisá el código: tiene 8 letras y números');
  });

  test('Código inexistente → 401 genérico', async () => {
    await registerAdult();
    const res = await claim('ZZZZZZZZ', PIN);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe(GENERIC_ERROR);
  });

  test('PIN incorrecto → 401 genérico y bloqueo del PIN → 429', async () => {
    const { token } = await registerAdult();
    const { linkCode } = await createDevice(token);

    const wrong = await claim(linkCode, '0000');
    expect(wrong.status).toBe(401);
    expect(wrong.body.error).toBe(GENERIC_ERROR);

    // Hasta el quinto intento fallido: el PIN del adulto queda bloqueado.
    for (let i = 0; i < 3; i++) {
      expect((await claim(linkCode, '0000')).status).toBe(401);
    }
    const locked = await claim(linkCode, '0000');
    expect(locked.status).toBe(429);
    expect(locked.body.error).toMatch(/Ingresaste mal el PIN demasiadas veces/);

    // El bloqueo es el mismo del resto de la app: tampoco sirve el PIN correcto.
    const stillLocked = await request(app)
      .post('/api/auth/pin/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: PIN });
    expect(stillLocked.status).toBe(429);
  });

  test('5 PIN incorrectos invalidan el código aunque después se desbloquee el PIN', async () => {
    const { token, responsibleId } = await registerAdult();
    const { deviceId, linkCode } = await createDevice(token);

    for (let i = 0; i < 5; i++) {
      await claim(linkCode, '0000');
    }
    expect(findDevice(deviceId).linkCodeUsedAt).toBeDefined();

    // Se levanta el bloqueo del PIN: el código igual ya no sirve.
    const adult = db.responsables.find(r => r.id === responsibleId)!;
    adult.pinLockedUntil = undefined;
    adult.pinFailedAttempts = undefined;

    const res = await claim(linkCode, PIN);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(GENERIC_ERROR);

    const list = await request(app).get('/api/devices').set('Authorization', `Bearer ${token}`);
    expect(list.body.devices[0].linkCode).toBeUndefined();
  });

  test('Código vencido → 401', async () => {
    const { token } = await registerAdult();
    const { deviceId, linkCode } = await createDevice(token);
    findDevice(deviceId).linkCodeExpiresAt = new Date(Date.now() - 1000).toISOString();

    const res = await claim(linkCode, PIN);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe(GENERIC_ERROR);
  });

  test('Código ya usado → 401', async () => {
    const { token } = await registerAdult();
    const { linkCode } = await createDevice(token);

    expect((await claim(linkCode, PIN)).status).toBe(200);
    const again = await claim(linkCode, PIN);

    expect(again.status).toBe(401);
    expect(again.body.error).toBe(GENERIC_ERROR);
  });

  test('Responsable sin PIN → 401 genérico (no revela el motivo)', async () => {
    const { token } = await registerAdult('sinpin@test.com', null);
    const { linkCode } = await createDevice(token);

    const res = await claim(linkCode, PIN);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe(GENERIC_ERROR);
  });

  test('Más de 10 intentos fallidos desde una IP → 429, aun con datos correctos', async () => {
    const { token } = await registerAdult();
    const { linkCode } = await createDevice(token);
    const ip = '203.0.113.7';

    for (let i = 0; i < 10; i++) {
      expect((await claim('ZZZZZZZZ', PIN, ip)).status).toBe(401);
    }

    const throttled = await claim(linkCode, PIN, ip);
    expect(throttled.status).toBe(429);
    expect(throttled.body.error).toBe('Demasiados intentos. Probá de nuevo en unos minutos.');

    // Se guarda el hash de la IP, no la IP.
    expect(JSON.stringify(db.claimThrottle)).not.toContain(ip);

    // Otra IP no queda afectada.
    const otherIp = await claim(linkCode, PIN, '198.51.100.4');
    expect(otherIp.status).toBe(200);
  });

  test('4 PIN incorrectos y el quinto correcto → vincula igual', async () => {
    const { token } = await registerAdult();
    const { deviceId, linkCode } = await createDevice(token);

    for (let i = 0; i < 4; i++) {
      expect((await claim(linkCode, '0000')).status).toBe(401);
    }
    const res = await claim(linkCode, PIN);

    expect(res.status).toBe(200);
    expect(findDevice(deviceId).status).toBe('active');
  });

  test('Ráfaga en paralelo: no se comparan más de 5 PIN ni se pasan los 10 intentos por IP', async () => {
    const { token, responsibleId } = await registerAdult();
    const { deviceId, linkCode } = await createDevice(token);
    const ip = '203.0.113.50';
    const compare = jest.spyOn(bcrypt, 'compare');
    compare.mockClear();

    // 30 PIN incorrectos a la vez (antes se comparaban todos y el contador pasaba de 10).
    const pins = Array.from({ length: 30 }, (_, i) => String(1000 + i));
    const responses = await Promise.all(pins.map(pin => claim(linkCode, pin, ip)));

    try {
      expect(compare.mock.calls.length).toBeLessThanOrEqual(5);
      expect(responses.every(r => r.status === 401 || r.status === 429)).toBe(true);
      const [entry] = Object.values(db.claimThrottle);
      expect(entry.count).toBeLessThanOrEqual(10);
      // El PIN del adulto quedó bloqueado y el código, invalidado.
      expect(db.responsables.find(r => r.id === responsibleId)!.pinLockedUntil).toBeDefined();
      expect(findDevice(deviceId).linkCodeUsedAt).toBeDefined();
      expect(findDevice(deviceId).deviceSecretHash).toBeUndefined();
    } finally {
      compare.mockRestore();
    }
  });

  test('Un PIN correcto no levanta el bloqueo que pusieron otros pedidos en paralelo', async () => {
    const { responsibleId } = await registerAdult();
    const adult = db.responsables.find(r => r.id === responsibleId)!;
    adult.pinFailedAttempts = 3;

    // El correcto entra cuarto; el quinto (incorrecto) bloquea mientras se comparan.
    const [correct, wrong] = await Promise.all([
      checkResponsiblePin(adult, PIN),
      checkResponsiblePin(adult, '0000')
    ]);

    expect(correct.ok).toBe(true);
    expect(wrong.ok).toBe(false);
    expect(Date.parse(adult.pinLockedUntil ?? '')).toBeGreaterThan(Date.now());
    // Mientras tanto, otro pedido ya no llega a comparar.
    expect(await checkResponsiblePin(adult, PIN)).toMatchObject({ ok: false });
  });

  test('Si el quinto intento es el correcto, levanta su propio bloqueo', async () => {
    const { responsibleId } = await registerAdult();
    const adult = db.responsables.find(r => r.id === responsibleId)!;
    adult.pinFailedAttempts = 4;

    expect((await checkResponsiblePin(adult, PIN)).ok).toBe(true);
    expect(adult.pinLockedUntil).toBeUndefined();
    expect(adult.pinFailedAttempts).toBeUndefined();
  });

  test('La ventana del límite por IP vence a los 15 minutos', async () => {
    const { token } = await registerAdult();
    const { linkCode } = await createDevice(token);
    const ip = '203.0.113.8';

    for (let i = 0; i < 10; i++) {
      await claim('ZZZZZZZZ', PIN, ip);
    }
    for (const entry of Object.values(db.claimThrottle)) {
      entry.firstAt = new Date(Date.now() - 16 * 60000).toISOString();
    }

    expect((await claim(linkCode, PIN, ip)).status).toBe(200);
  });
});

describe('Credencial del celular (Authorization: Device ...)', () => {
  test('No sirve en las rutas del adulto: GET /api/devices → 401', async () => {
    const { deviceAccessToken } = await linkedDevice();

    const res = await request(app).get('/api/devices').set('Authorization', asDevice(deviceAccessToken));

    expect(res.status).toBe(401);
  });

  test('El JWT del adulto no sirve en /me → 401', async () => {
    const { token } = await linkedDevice();

    const res = await request(app).get('/api/devices/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Este celular ya no está vinculado');
  });

  test('Credencial inventada o ausente → 401', async () => {
    await linkedDevice();

    const fake = await request(app).get('/api/devices/me').set('Authorization', 'Device inventada');
    const missing = await request(app).get('/api/devices/me');

    expect(fake.status).toBe(401);
    expect(missing.status).toBe(401);
  });

  test('GET /me → datos mínimos del celular y actualiza lastSeen', async () => {
    const { deviceAccessToken, deviceId } = await linkedDevice();
    findDevice(deviceId).lastSeen = '2020-01-01T00:00:00.000Z';

    const res = await request(app).get('/api/devices/me').set('Authorization', asDevice(deviceAccessToken));

    expect(res.status).toBe(200);
    expect(res.body.device).toMatchObject({
      id: deviceId,
      deviceName: 'Celular de Sofi',
      status: 'active'
    });
    expect(res.body.device.lastSeen).not.toBe('2020-01-01T00:00:00.000Z');
    expect(res.body.device.responsibleId).toBeUndefined();
    expect(res.body.device.fechaNacimiento).toBeUndefined();
  });

  test('GET /me/blocklist → oficial + personalizados del dueño (no de otros)', async () => {
    const { token, deviceAccessToken } = await linkedDevice();
    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'sitio-del-dueno.com' });
    const other = await registerAdult('otro@test.com');
    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ domain: 'sitio-de-otro.com' });

    const res = await request(app)
      .get('/api/devices/me/blocklist')
      .set('Authorization', asDevice(deviceAccessToken));

    expect(res.status).toBe(200);
    const domains = res.body.blocklist.map((item: any) => item.domain);
    expect(domains).toContain('sitio-del-dueno.com');
    expect(domains).not.toContain('sitio-de-otro.com');
    expect(res.body.blocklist.some((item: any) => item.type === 'LOTBA_OFFICIAL')).toBe(true);
    expect(res.body.status.totalCustom).toBe(1);

    // Misma forma que GET /api/blocklist del adulto.
    const adult = await request(app).get('/api/blocklist').set('Authorization', `Bearer ${token}`);
    expect(res.body).toEqual(adult.body);
  });

  test('POST /me/events → 201 con el dispositivo de la credencial y alerta para el adulto', async () => {
    const { deviceAccessToken, deviceId, responsibleId } = await linkedDevice();

    const res = await request(app)
      .post('/api/devices/me/events')
      .set('Authorization', asDevice(deviceAccessToken))
      .send({
        // El deviceId del cuerpo se ignora: manda la credencial.
        deviceId: 'otro-dispositivo',
        eventType: 'SITE_BLOCKED',
        domain: 'apuestas.example',
        details: 'Bloqueado por la VPN'
      });

    expect(res.status).toBe(201);
    expect(res.body.event.deviceId).toBe(deviceId);
    const alert = db.alerts.find(a => a.alertType === 'SITE_BLOCKED' && a.deviceId === deviceId);
    expect(alert).toBeDefined();
    expect(alert!.responsibleId).toBe(responsibleId);
  });

  test('POST /me/events valida el tipo y los detalles → 400', async () => {
    const { deviceAccessToken } = await linkedDevice();

    const badType = await request(app)
      .post('/api/devices/me/events')
      .set('Authorization', asDevice(deviceAccessToken))
      .send({ eventType: 'CUALQUIERA', details: 'x' });
    const noDetails = await request(app)
      .post('/api/devices/me/events')
      .set('Authorization', asDevice(deviceAccessToken))
      .send({ eventType: 'SITE_BLOCKED' });

    expect(badType.status).toBe(400);
    expect(noDetails.status).toBe(400);
  });

  test('POST /me/verify-pin → 200 / 401 / 429', async () => {
    const { deviceAccessToken } = await linkedDevice();
    const verify = (pin: string) =>
      request(app)
        .post('/api/devices/me/verify-pin')
        .set('Authorization', asDevice(deviceAccessToken))
        .send({ pin });

    const ok = await verify(PIN);
    expect(ok.status).toBe(200);
    expect(ok.body.valid).toBe(true);

    const wrong = await verify('0000');
    expect(wrong.status).toBe(401);
    // Distinto de la credencial revocada: la app no debe cerrar la sesión del celular.
    expect(wrong.body.code).toBe('INVALID_PIN');

    for (let i = 0; i < 3; i++) await verify('0000');
    const locked = await verify('0000');
    expect(locked.status).toBe(429);
  });

  test('PATCH /me/status exige PIN y registra PROTECTION_MODIFIED', async () => {
    const { deviceAccessToken, deviceId } = await linkedDevice();
    const patch = (body: Record<string, unknown>) =>
      request(app)
        .patch('/api/devices/me/status')
        .set('Authorization', asDevice(deviceAccessToken))
        .send(body);

    expect((await patch({ status: 'inactive' })).status).toBe(400);
    expect((await patch({ status: 'inactive', pin: '0000' })).status).toBe(401);
    expect(findDevice(deviceId).status).toBe('active');
    expect((await patch({ status: 'pending', pin: PIN })).status).toBe(400);

    const paused = await patch({ status: 'inactive', pin: PIN });
    expect(paused.status).toBe(200);
    expect(paused.body.device.status).toBe('inactive');
    expect(paused.body.device.deviceSecretHash).toBeUndefined();
    expect(db.events.some(e => e.deviceId === deviceId && e.eventType === 'PROTECTION_MODIFIED')).toBe(true);

    // Pausado sigue vinculado: la credencial vale y puede reactivar.
    const me = await request(app).get('/api/devices/me').set('Authorization', asDevice(deviceAccessToken));
    expect(me.status).toBe(200);
    expect(me.body.device.status).toBe('inactive');

    const resumed = await patch({ status: 'active', pin: PIN });
    expect(resumed.status).toBe(200);
    expect(resumed.body.device.status).toBe('active');
  });

  test('POST /me/unlink con PIN revoca la credencial y deja un código nuevo', async () => {
    const { token, deviceAccessToken, deviceId, linkCode } = await linkedDevice();
    const unlink = (pin?: string) =>
      request(app)
        .post('/api/devices/me/unlink')
        .set('Authorization', asDevice(deviceAccessToken))
        .send(pin ? { pin } : {});

    expect((await unlink()).status).toBe(400);
    expect((await unlink('0000')).status).toBe(401);

    const res = await unlink(PIN);
    expect(res.status).toBe(200);

    const me = await request(app).get('/api/devices/me').set('Authorization', asDevice(deviceAccessToken));
    expect(me.status).toBe(401);
    expect(me.body.error).toBe('Este celular ya no está vinculado');

    const stored = findDevice(deviceId);
    expect(stored.status).toBe('pending');
    expect(stored.deviceSecretHash).toBeUndefined();
    expect(stored.linkedAt).toBeUndefined();

    const alert = db.alerts.find(a => a.deviceId === deviceId && a.alertType === 'DEVICE_UNLINKED');
    expect(alert).toBeDefined();
    expect(alert!.message).toContain('Celular de Sofi');

    const list = await request(app).get('/api/devices').set('Authorization', `Bearer ${token}`);
    const [device] = list.body.devices;
    expect(device.status).toBe('pending');
    expect(device.linkCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(device.linkCode).not.toBe(linkCode);
    expect(Date.parse(device.linkCodeExpiresAt)).toBeGreaterThan(Date.now());

    // Con el código nuevo se puede volver a vincular.
    expect((await claim(device.linkCode, PIN)).status).toBe(200);
  });

  test('POST /api/blocklist/check con la credencial del celular suma los personalizados del dueño', async () => {
    const { token, deviceAccessToken } = await linkedDevice();
    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'solo-para-sofi.com' });

    const anonymous = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'solo-para-sofi.com' });
    const withDevice = await request(app)
      .post('/api/blocklist/check')
      .set('Authorization', asDevice(deviceAccessToken))
      .send({ domain: 'https://solo-para-sofi.com/juego' });
    const revokedish = await request(app)
      .post('/api/blocklist/check')
      .set('Authorization', 'Device inventada')
      .send({ domain: 'solo-para-sofi.com' });

    expect(anonymous.body.isBlocked).toBe(false);
    expect(withDevice.status).toBe(200);
    expect(withDevice.body.isBlocked).toBe(true);
    expect(withDevice.body.matchType).toBe('CUSTOM');
    expect(revokedish.body.isBlocked).toBe(false);
  });
});

describe('POST /api/devices/:id/link-code', () => {
  test('Pendiente: genera un código nuevo sin PIN y el anterior deja de servir', async () => {
    const { token } = await registerAdult();
    const { deviceId, linkCode } = await createDevice(token);

    const res = await request(app)
      .post(`/api/devices/${deviceId}/link-code`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.linkCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(res.body.linkCode).not.toBe(linkCode);
    expect(Date.parse(res.body.linkCodeExpiresAt)).toBeGreaterThan(Date.now());
    expect(res.body.device.linkCode).toBe(res.body.linkCode);
    expect(res.body.device.deviceSecretHash).toBeUndefined();

    expect((await claim(linkCode, PIN)).status).toBe(401);
    expect((await claim(res.body.linkCode, PIN)).status).toBe(200);
  });

  test('Vencido: el adulto lo renueva y vuelve a mostrarse', async () => {
    const { token } = await registerAdult();
    const { deviceId } = await createDevice(token);
    findDevice(deviceId).linkCodeExpiresAt = new Date(Date.now() - 1000).toISOString();

    const before = await request(app).get('/api/devices').set('Authorization', `Bearer ${token}`);
    expect(before.body.devices[0].linkCode).toBeUndefined();

    const res = await request(app)
      .post(`/api/devices/${deviceId}/link-code`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const after = await request(app).get('/api/devices').set('Authorization', `Bearer ${token}`);
    expect(after.body.devices[0].linkCode).toBe(res.body.linkCode);
  });

  test('Activo: exige el PIN, revoca la credencial y vuelve a pendiente', async () => {
    const { token, deviceId, deviceAccessToken } = await linkedDevice();
    const regenerate = (body: Record<string, unknown>) =>
      request(app)
        .post(`/api/devices/${deviceId}/link-code`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    expect((await regenerate({})).status).toBe(400);
    expect((await regenerate({ pin: '0000' })).status).toBe(401);
    expect(findDevice(deviceId).status).toBe('active');

    const res = await regenerate({ pin: PIN });
    expect(res.status).toBe(200);
    expect(res.body.device.status).toBe('pending');
    expect(res.body.device.linkedAt).toBeUndefined();

    const me = await request(app).get('/api/devices/me').set('Authorization', asDevice(deviceAccessToken));
    expect(me.status).toBe(401);

    expect((await claim(res.body.linkCode, PIN)).status).toBe(200);
  });

  test('Dispositivo de otra cuenta → 404', async () => {
    const { deviceId } = await linkedDevice();
    const other = await registerAdult('otra@test.com');

    const res = await request(app)
      .post(`/api/devices/${deviceId}/link-code`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ pin: PIN });

    expect(res.status).toBe(404);
  });

  test('Sin sesión → 401', async () => {
    const res = await request(app).post('/api/devices/x/link-code');
    expect(res.status).toBe(401);
  });
});

describe('Desvincular desde la sesión del adulto (PATCH /api/devices/:id/status a pending)', () => {
  test('Revoca la credencial del celular y genera un código nuevo', async () => {
    const { token, deviceId, deviceAccessToken, linkCode } = await linkedDevice();

    const res = await request(app)
      .patch(`/api/devices/${deviceId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pending' });

    expect(res.status).toBe(200);
    expect(res.body.device.status).toBe('pending');
    expect(res.body.device.linkCode).toBeDefined();
    expect(res.body.device.linkCode).not.toBe(linkCode);

    const me = await request(app).get('/api/devices/me').set('Authorization', asDevice(deviceAccessToken));
    expect(me.status).toBe(401);
  });

  test('Un celular de la forma anterior no reactiva el perfil desvinculado ni gasta el código nuevo', async () => {
    const { token } = await registerAdult();
    const { deviceId } = await createDevice(token);
    // Vinculado iniciando sesión en el celular del menor (sin credencial propia).
    await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, pin: PIN });

    const unlinked = await request(app)
      .post(`/api/devices/${deviceId}/link-code`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: PIN });
    const newCode = unlinked.body.linkCode as string;

    // Ese celular sigue con la sesión del adulto y, al prender la protección, manda esto:
    for (const status of ['active', 'inactive']) {
      const res = await request(app)
        .patch(`/api/devices/${deviceId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });
      expect(res.status).toBe(409);
    }
    expect(findDevice(deviceId).status).toBe('pending');

    expect((await claim(newCode, PIN)).status).toBe(200);
  });
});

describe('trust proxy', () => {
  test('Sin VERCEL ni TRUST_PROXY no se confía en X-Forwarded-For', () => {
    expect(trustProxySetting({})).toBe(false);
  });

  test('En Vercel, un proxy', () => {
    expect(trustProxySetting({ VERCEL: '1' })).toBe(1);
  });

  test('TRUST_PROXY lo fija a mano', () => {
    expect(trustProxySetting({ TRUST_PROXY: '2' })).toBe(2);
    expect(trustProxySetting({ TRUST_PROXY: 'false', VERCEL: '1' })).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: '10.0.0.0/8' })).toBe('10.0.0.0/8');
  });

  test('Sin proxy de confianza, cambiar X-Forwarded-For no esquiva el límite por IP', async () => {
    app.set('trust proxy', false);
    try {
      await registerAdult();
      for (let i = 0; i < 10; i++) {
        await claim('ZZZZZZZZ', PIN, `198.51.100.${i}`);
      }
      const res = await claim('ZZZZZZZZ', PIN, '198.51.100.200');
      expect(res.status).toBe(429);
    } finally {
      app.set('trust proxy', 1);
    }
  });
});

describe('Flujo anterior (confirm-link con la sesión del adulto)', () => {
  test('Sigue funcionando, registra linkedAt y el código deja de servir', async () => {
    const { token } = await registerAdult();
    const { deviceId, linkCode } = await createDevice(token);

    const res = await request(app)
      .post('/api/devices/confirm-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId, pin: PIN });

    expect(res.status).toBe(200);
    expect(res.body.device.status).toBe('active');
    expect(res.body.device.linkedAt).toBeDefined();
    expect((await claim(linkCode, PIN)).status).toBe(401);
  });
});

describe('JWT_SECRET en producción', () => {
  const saved = {
    JWT_SECRET: process.env.JWT_SECRET,
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV
  };

  const restore = () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  afterEach(restore);

  test('Sin JWT_SECRET y con VERCEL=1, el módulo de auth no carga', () => {
    delete process.env.JWT_SECRET;
    process.env.VERCEL = '1';

    expect(() => {
      jest.isolateModules(() => {
        require('../middleware/auth.middleware');
      });
    }).toThrow(/JWT_SECRET/);
  });

  test('Sin JWT_SECRET y con NODE_ENV=production, tampoco', () => {
    delete process.env.JWT_SECRET;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'production';

    expect(() => {
      jest.isolateModules(() => {
        require('../middleware/auth.middleware');
      });
    }).toThrow(/JWT_SECRET/);
  });

  test('En desarrollo y tests sigue la clave por defecto', () => {
    delete process.env.JWT_SECRET;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';

    expect(() => {
      jest.isolateModules(() => {
        require('../middleware/auth.middleware');
      });
    }).not.toThrow();
  });

  test('Con JWT_SECRET definido, carga en Vercel', () => {
    process.env.JWT_SECRET = 'clave-de-prueba';
    process.env.VERCEL = '1';

    expect(() => {
      jest.isolateModules(() => {
        require('../middleware/auth.middleware');
      });
    }).not.toThrow();
  });
});
