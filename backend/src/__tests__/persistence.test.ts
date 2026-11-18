import request from 'supertest';
import app from '../index';
import { db } from '../config/db';
import { loadState, saveState, strongEtag } from '../config/persistence';

describe('strongEtag', () => {
  test('quita el prefijo débil que Blob agrega a las respuestas comprimidas', () => {
    expect(strongEtag('W/"99300a8fddcf077c4df3bd1b34d04456"')).toBe('"99300a8fddcf077c4df3bd1b34d04456"');
    expect(strongEtag('"abc"')).toBe('"abc"');
    expect(strongEtag(undefined)).toBeNull();
  });
});

/**
 * Persistencia con Redis (simulado): en el resto de las pruebas está apagada
 * (NODE_ENV=test), así que acá se prende con un Redis falso en memoria para
 * comprobar que los intentos fallidos se guardan y que una escritura de otra
 * instancia no se pisa.
 */

app.set('trust proxy', 1);

const PIN = '4829';
const STATE_KEY = 'test:state';
const VERSION_KEY = `${STATE_KEY}:version`;

const store = new Map<string, string>();
/** Se ejecuta justo antes de la escritura condicional: simula otra instancia. */
let beforeConditionalSet: (() => void) | null = null;

const fakeRedis = async (_url: unknown, init?: { body?: unknown }) => {
  const [name, ...args] = JSON.parse(String(init?.body)) as (string | number)[];
  let result: unknown = null;
  switch (String(name).toUpperCase()) {
    case 'GET':
      result = store.get(String(args[0])) ?? null;
      break;
    case 'SET':
      store.set(String(args[0]), String(args[1]));
      result = 'OK';
      break;
    case 'MGET':
      result = args.map(key => store.get(String(key)) ?? null);
      break;
    case 'EVAL': {
      const hook = beforeConditionalSet;
      beforeConditionalSet = null;
      hook?.();
      const [, , stateKey, versionKey, expected, value] = args.map(String);
      const current = store.get(versionKey) ?? '0';
      if (current !== expected) {
        result = 0;
      } else {
        store.set(stateKey, value);
        store.set(versionKey, String(Number(current) + 1));
        result = 1;
      }
      break;
    }
    default:
      throw new Error(`Comando no soportado en el Redis de prueba: ${name}`);
  }
  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

const storedState = () => JSON.parse(store.get(STATE_KEY) ?? '{}');

const savedEnv = {
  NODE_ENV: process.env.NODE_ENV,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  STATE_KEY: process.env.STATE_KEY
};
let fetchSpy: jest.SpyInstance;

beforeAll(() => {
  process.env.NODE_ENV = 'development';
  process.env.KV_REST_API_URL = 'https://redis.test';
  process.env.KV_REST_API_TOKEN = 'token-de-prueba';
  process.env.STATE_KEY = STATE_KEY;
  fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(fakeRedis as unknown as typeof fetch);
});

afterAll(() => {
  fetchSpy.mockRestore();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

beforeEach(() => {
  store.clear();
  beforeConditionalSet = null;
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.claimThrottle = {};
  db.siteSuggestions = [];
});

/** Adulto con PIN y un dispositivo pendiente, todo guardado en el Redis falso. */
const setup = async () => {
  const register = await request(app).post('/api/auth/register').send({
    nombre: 'Adulto Responsable',
    email: 'persistencia@test.com',
    password: 'password123',
    telefono: '+5491122334455',
    esResponsable: true
  });
  const token = register.body.token as string;
  await request(app).patch('/api/auth/pin').set('Authorization', `Bearer ${token}`).send({ pin: PIN });
  const link = await request(app)
    .post('/api/devices/link')
    .set('Authorization', `Bearer ${token}`)
    .send({ deviceName: 'Celular de Sofi', fechaNacimiento: '2014-03-20' });
  return { token, deviceId: link.body.device.id as string, linkCode: link.body.linkCode as string };
};

const claim = (linkCode: string, pin: string, ip = '203.0.113.9') =>
  request(app).post('/api/devices/claim').set('X-Forwarded-For', ip).send({ linkCode, pin });

/** Simula que la próxima lectura la hace otra instancia, con la memoria vacía. */
const forgetMemory = () => {
  db.responsables = [];
  db.devices = [];
  db.claimThrottle = {};
};

describe('Persistencia de los intentos fallidos', () => {
  test('Un 401 del claim guarda el contador por IP, los intentos del código y del PIN', async () => {
    const { deviceId, linkCode } = await setup();

    expect((await claim(linkCode, '0000')).status).toBe(401);

    let state = storedState();
    expect(Object.values(state.claimThrottle)).toEqual([expect.objectContaining({ count: 1 })]);
    expect(state.devices.find((d: any) => d.id === deviceId).linkFailedAttempts).toBe(1);
    expect(state.responsables[0].pinFailedAttempts).toBe(1);

    // Otra instancia parte de lo guardado, no de cero.
    forgetMemory();
    expect((await claim(linkCode, '0000')).status).toBe(401);

    state = storedState();
    expect(Object.values(state.claimThrottle)).toEqual([expect.objectContaining({ count: 2 })]);
    expect(state.devices.find((d: any) => d.id === deviceId).linkFailedAttempts).toBe(2);
    expect(state.responsables[0].pinFailedAttempts).toBe(2);
  });

  test('Un PIN incorrecto en /me/verify-pin también se guarda', async () => {
    const { linkCode } = await setup();
    const claimed = await claim(linkCode, PIN);
    expect(claimed.status).toBe(200);

    const res = await request(app)
      .post('/api/devices/me/verify-pin')
      .set('Authorization', `Device ${claimed.body.deviceAccessToken}`)
      .send({ pin: '0000' });

    expect(res.status).toBe(401);
    expect(storedState().responsables[0].pinFailedAttempts).toBe(1);
  });
});

describe('Snapshot', () => {
  test('Ida y vuelta con sugerencias y límite de claim', async () => {
    await loadState();
    const suggestion = {
      id: 's1',
      responsibleId: 'r1',
      domain: 'apuestas.example',
      motivo: 'apuestas_ilegales' as const,
      createdAt: new Date().toISOString(),
      status: 'pendiente' as const
    };
    const throttle = { abc: { count: 3, firstAt: new Date().toISOString() } };
    db.siteSuggestions = [suggestion];
    db.claimThrottle = throttle;
    await saveState();

    db.siteSuggestions = [];
    db.claimThrottle = {};
    await loadState();

    expect(db.siteSuggestions).toEqual([suggestion]);
    expect(db.claimThrottle).toEqual(throttle);
  });

  test('Ida y vuelta con las opiniones de "Ayudanos a mejorar"', async () => {
    await loadState();
    const item = {
      id: 'f1',
      responsibleId: 'r1',
      text: 'Me gustaría un resumen semanal',
      createdAt: new Date().toISOString()
    };
    db.feedback = [item];
    await saveState();
    expect(storedState().feedback).toEqual([item]);

    db.feedback = [];
    await loadState();

    expect(db.feedback).toEqual([item]);
  });

  test('Un estado guardado antes de estas funciones carga con valores vacíos', async () => {
    store.set(
      STATE_KEY,
      JSON.stringify({
        responsables: [],
        devices: [],
        events: [],
        alerts: [],
        blocklistSyncLog: [],
        blocklist: []
      })
    );
    db.siteSuggestions = [{ id: 'viejo' } as any];
    db.claimThrottle = { viejo: { count: 1, firstAt: new Date().toISOString() } };
    db.feedback = [{ id: 'viejo' } as any];

    await loadState();

    expect(db.siteSuggestions).toEqual([]);
    expect(db.claimThrottle).toEqual({});
    expect(db.feedback).toEqual([]);
  });
});

describe('Escritura condicional (otra instancia guardó en el medio)', () => {
  test('Un evento del celular no restaura la credencial que el adulto revocó', async () => {
    const { deviceId, linkCode } = await setup();
    const claimed = await claim(linkCode, PIN);
    const deviceAccessToken = claimed.body.deviceAccessToken as string;

    // Mientras se atiende el evento, otra instancia guarda la desvinculación.
    beforeConditionalSet = () => {
      const state = storedState();
      const device = state.devices.find((d: any) => d.id === deviceId);
      delete device.deviceSecretHash;
      device.status = 'pending';
      store.set(STATE_KEY, JSON.stringify(state));
      store.set(VERSION_KEY, String(Number(store.get(VERSION_KEY) ?? '0') + 1));
    };

    const res = await request(app)
      .post('/api/devices/me/events')
      .set('Authorization', `Device ${deviceAccessToken}`)
      .send({ eventType: 'SITE_BLOCKED', domain: 'apuestas.example', details: 'Bloqueado' });

    expect(res.status).toBe(503);
    const device = storedState().devices.find((d: any) => d.id === deviceId);
    expect(device.deviceSecretHash).toBeUndefined();
    expect(device.status).toBe('pending');

    const me = await request(app).get('/api/devices/me').set('Authorization', `Device ${deviceAccessToken}`);
    expect(me.status).toBe(401);
  });

  test('Un claim que no se pudo guardar no entrega la credencial', async () => {
    const { deviceId, linkCode } = await setup();
    beforeConditionalSet = () => {
      store.set(VERSION_KEY, String(Number(store.get(VERSION_KEY) ?? '0') + 1));
    };

    const res = await claim(linkCode, PIN);

    expect(res.status).toBe(503);
    expect(res.body.deviceAccessToken).toBeUndefined();
    const device = storedState().devices.find((d: any) => d.id === deviceId);
    expect(device.status).toBe('pending');
    expect(device.deviceSecretHash).toBeUndefined();

    // El código sigue sirviendo para reintentar.
    expect((await claim(linkCode, PIN)).status).toBe(200);
  });
});
