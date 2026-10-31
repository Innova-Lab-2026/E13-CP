import request from 'supertest';
import app from '../index';
import { db, buildOfficialBlocklistItems } from '../config/db';
import { CURRENT_OFFICIAL_BLOCKLIST } from '../config/blocklistSource';

const ADMIN_SECRET = 'secreto-de-pruebas-admin';

beforeAll(() => {
  process.env.ADMIN_SECRET = ADMIN_SECRET;
});

beforeEach(() => {
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.blocklistSyncLog = [];
  // Se restablece la lista oficial desde la fuente canónica para que cada test
  // parta del mismo estado, sin depender del orden de ejecución.
  db.blocklist = buildOfficialBlocklistItems(CURRENT_OFFICIAL_BLOCKLIST);
});

/** Registra un adulto y devuelve su token. */
const registerAndLogin = async (email = 'adulto@test.com') => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      nombre: 'Adulto Responsable',
      email,
      password: 'password123',
      telefono: '+5491122334455',
      esResponsable: true
    });
  return res.body.token as string;
};

describe('Blocklist - consulta de dominios', () => {
  test('POST /api/blocklist/check bloquea un dominio oficial y devuelve la categoria', async () => {
    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'apuestasilegalesba.com' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);
    expect(res.body.blocked).toBe(true);
    expect(res.body.matchType).toBe('LOTBA_OFFICIAL');
    expect(res.body.categoria).toBe('Apuestas');
    expect(res.body.matchedDomain).toBe('apuestasilegalesba.com');
  });

  test('POST /api/blocklist/check detecta el dominio dentro de una URL completa', async () => {
    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'https://www.apuestasilegalesba.com/juego?x=1' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);
  });

  test('POST /api/blocklist/check responde isBlocked false para un dominio no listado', async () => {
    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: 'sitio-que-no-esta-en-la-lista.com' });

    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(false);
    expect(res.body.blocked).toBe(false);
    expect(res.body.matchType).toBeNull();
    expect(res.body.categoria).toBeNull();
  });

  test('POST /api/blocklist/check exige el dominio', async () => {
    const res = await request(app).post('/api/blocklist/check').send({});

    expect(res.status).toBe(400);
  });

  test('POST /api/blocklist/check normaliza el dominio a minúsculas', async () => {
    const res = await request(app)
      .post('/api/blocklist/check')
      .send({ domain: '  APUESTASILEGALESBA.COM  ' });

    expect(res.status).toBe(200);
    expect(res.body.domain).toBe('apuestasilegalesba.com');
    expect(res.body.isBlocked).toBe(true);
  });
});

describe('Blocklist - dominios personalizados', () => {
  test('POST /api/blocklist/custom agrega un dominio con categoria Personalizado', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'MiSitioSospechoso.com' });

    expect(res.status).toBe(201);
    expect(res.body.item.domain).toBe('misitiosospechoso.com');
    expect(res.body.item.type).toBe('CUSTOM');
    expect(res.body.item.categoria).toBe('Personalizado');
  });

  test('POST /api/blocklist/custom rechaza un dominio duplicado', async () => {
    const token = await registerAndLogin();

    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'misitiosospechoso.com' });

    const res = await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'misitiosospechoso.com' });

    expect(res.status).toBe(400);
  });

  test('POST /api/blocklist/custom rechaza un dominio que ya es oficial', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'apuestasilegalesba.com' });

    expect(res.status).toBe(400);
  });

  test('GET /api/blocklist combina la lista oficial con los personalizados del responsable', async () => {
    const token = await registerAndLogin();

    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'misitiosospechoso.com' });

    const res = await request(app)
      .get('/api/blocklist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.blocklist.length).toBe(CURRENT_OFFICIAL_BLOCKLIST.domains.length + 1);
    expect(res.body.status.totalOfficial).toBe(CURRENT_OFFICIAL_BLOCKLIST.domains.length);
    expect(res.body.status.totalCustom).toBe(1);
  });

  test('GET /api/blocklist no expone los personalizados de otro responsable', async () => {
    const tokenA = await registerAndLogin('a@test.com');
    const tokenB = await registerAndLogin('b@test.com');

    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ domain: 'privado-de-a.com' });

    const res = await request(app)
      .get('/api/blocklist')
      .set('Authorization', `Bearer ${tokenB}`);

    const domains = res.body.blocklist.map((item: any) => item.domain);
    expect(domains).not.toContain('privado-de-a.com');
  });

  test('DELETE /api/blocklist/custom/:id no permite borrar un dominio oficial', async () => {
    const token = await registerAndLogin();
    const official = db.blocklist.find(item => item.type === 'LOTBA_OFFICIAL');

    const res = await request(app)
      .delete(`/api/blocklist/custom/${official!.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('DELETE /api/blocklist/custom/:id borra un dominio propio', async () => {
    const token = await registerAndLogin();

    const created = await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'mio.com' });

    const res = await request(app)
      .delete(`/api/blocklist/custom/${created.body.item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.item.domain).toBe('mio.com');
  });
});

describe('Blocklist - estado de actualización', () => {
  test('GET /api/blocklist/status expone el período, el origen y los totales', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .get('/api/blocklist/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(CURRENT_OFFICIAL_BLOCKLIST.version);
    expect(res.body.source).toBe(CURRENT_OFFICIAL_BLOCKLIST.source);
    expect(res.body.lastUpdated).toBeDefined();
    expect(res.body.totalOfficial).toBe(CURRENT_OFFICIAL_BLOCKLIST.domains.length);
    expect(res.body.totalCustom).toBe(0);
  });

  test('GET /api/blocklist/status exige autenticación', async () => {
    const res = await request(app).get('/api/blocklist/status');

    expect(res.status).toBe(401);
  });
});

describe('Blocklist - sincronización de la lista oficial', () => {
  test('POST /api/blocklist/sync/official reemplaza la lista oficial', async () => {
    const res = await request(app)
      .post('/api/blocklist/sync/official')
      .set('x-admin-secret', ADMIN_SECRET)
      .set('x-admin-requested-by', 'nahir')
      .send({
        version: '2026-11',
        source: 'LOTBA - listado oficial mensual',
        updatedAt: '2026-11-01T00:00:00.000Z',
        domains: [
          { domain: 'nuevooficial.com', categoria: 'Apuestas' },
          { domain: 'otrooficial.net', categoria: 'Apuestas' }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.sync.version).toBe('2026-11');
    expect(res.body.sync.totalOfficial).toBe(2);
    expect(res.body.sync.added).toEqual(
      expect.arrayContaining(['nuevooficial.com', 'otrooficial.net'])
    );
    expect(res.body.sync.removed).toEqual(
      expect.arrayContaining(['apuestasilegalesba.com'])
    );

    const official = db.blocklist.filter(item => item.type === 'LOTBA_OFFICIAL');
    expect(official.length).toBe(2);
    expect(official[0].period).toBe('2026-11');
  });

  test('POST /api/blocklist/sync/official conserva los dominios personalizados', async () => {
    const token = await registerAndLogin();

    await request(app)
      .post('/api/blocklist/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'mipersonalizado.com' });

    await request(app)
      .post('/api/blocklist/sync/official')
      .set('x-admin-secret', ADMIN_SECRET)
      .send({ version: '2026-11', domains: [{ domain: 'nuevooficial.com', categoria: 'Apuestas' }] });

    const custom = db.blocklist.filter(item => item.type === 'CUSTOM');
    expect(custom.length).toBe(1);
    expect(custom[0].domain).toBe('mipersonalizado.com');
  });

  test('POST /api/blocklist/sync/official registra la auditoría de la actualización', async () => {
    await request(app)
      .post('/api/blocklist/sync/official')
      .set('x-admin-secret', ADMIN_SECRET)
      .set('x-admin-requested-by', 'nahir')
      .send({ version: '2026-11', domains: [{ domain: 'nuevooficial.com', categoria: 'Apuestas' }] });

    expect(db.blocklistSyncLog.length).toBe(1);
    const log = db.blocklistSyncLog[0];
    expect(log.version).toBe('2026-11');
    expect(log.requestedBy).toBe('nahir');
    expect(log.totalOfficial).toBe(1);
    expect(log.added).toContain('nuevooficial.com');
    expect(log.removed).toContain('apuestasilegalesba.com');
  });

  test('POST /api/blocklist/sync/official sin secreto administrativo devuelve 401', async () => {
    const res = await request(app)
      .post('/api/blocklist/sync/official')
      .send({ version: '2026-11', domains: [] });

    expect(res.status).toBe(401);
  });

  test('POST /api/blocklist/sync/official con secreto incorrecto devuelve 401', async () => {
    const res = await request(app)
      .post('/api/blocklist/sync/official')
      .set('x-admin-secret', 'secreto-incorrecto')
      .send({ version: '2026-11', domains: [] });

    expect(res.status).toBe(401);
  });

  test('POST /api/blocklist/sync/official no es accesible con un JWT de adulto', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post('/api/blocklist/sync/official')
      .set('Authorization', `Bearer ${token}`)
      .send({ version: '2026-11', domains: [] });

    expect(res.status).toBe(401);
  });

  test('POST /api/blocklist/sync/official sin cuerpo recarga la fuente versionada vigente', async () => {
    const res = await request(app)
      .post('/api/blocklist/sync/official')
      .set('x-admin-secret', ADMIN_SECRET)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.sync.version).toBe(CURRENT_OFFICIAL_BLOCKLIST.version);
    expect(res.body.sync.totalOfficial).toBe(CURRENT_OFFICIAL_BLOCKLIST.domains.length);
  });
});
