import request from 'supertest';
import app from '../index';
import { db } from '../config/db';

/** "Sugerir un sitio": el adulto propone un dominio y el equipo lo revisa con LOTBA. */

const ADMIN_SECRET = 'secreto-de-pruebas-sugerencias';
let savedAdminSecret: string | undefined;

const registerAdult = async (email = 'adulto@test.com') => {
  const res = await request(app).post('/api/auth/register').send({
    nombre: 'Adulto Responsable',
    email,
    password: 'password123',
    esResponsable: true
  });
  return { token: res.body.token as string, responsibleId: res.body.responsible.id as string };
};

const suggest = (token: string, body: Record<string, unknown>) =>
  request(app)
    .post('/api/blocklist/suggestions')
    .set('Authorization', `Bearer ${token}`)
    .send(body);

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
  db.siteSuggestions = [];
  db.claimThrottle = {};
});

describe('POST /api/blocklist/suggestions', () => {
  test('201: guarda el dominio normalizado, el motivo y la información', async () => {
    const { token, responsibleId } = await registerAdult();
    const blocklistBefore = db.blocklist.length;

    const res = await suggest(token, {
      url: '  https://www.Apuestas-Truchas.com/ruleta?ref=123  ',
      motivo: 'apuestas_ilegales',
      info: '  Lo vi en una publicidad  '
    });

    expect(res.status).toBe(201);
    expect(res.body.suggestion).toMatchObject({
      responsibleId,
      domain: 'apuestas-truchas.com',
      motivo: 'apuestas_ilegales',
      info: 'Lo vi en una publicidad',
      status: 'pendiente'
    });
    expect(res.body.suggestion.id).toBeDefined();
    expect(res.body.suggestion.createdAt).toBeDefined();
    expect(db.siteSuggestions).toHaveLength(1);
    // Una sugerencia no bloquea nada por sí sola.
    expect(db.blocklist.length).toBe(blocklistBefore);
  });

  test('Acepta el dominio sin protocolo y la información es opcional', async () => {
    const { token } = await registerAdult();

    const res = await suggest(token, { url: 'Sitio-Raro.net', motivo: 'otro' });

    expect(res.status).toBe(201);
    expect(res.body.suggestion.domain).toBe('sitio-raro.net');
    expect(res.body.suggestion.info).toBeUndefined();
  });

  test('Sin URL → 400 "Por favor, ingresá la URL del sitio."', async () => {
    const { token } = await registerAdult();

    const res = await suggest(token, { url: '   ', motivo: 'otro' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Por favor, ingresá la URL del sitio.');
  });

  test('Una dirección que no es un sitio → 400', async () => {
    const { token } = await registerAdult();

    for (const url of ['no es un sitio', 'localhost', 'http://', 'sitio']) {
      const res = await suggest(token, { url, motivo: 'otro' });
      expect(res.status).toBe(400);
    }
  });

  test('Sin motivo o con uno desconocido → 400 "Por favor, seleccioná el motivo."', async () => {
    const { token } = await registerAdult();

    const missing = await suggest(token, { url: 'sitio.com' });
    const unknown = await suggest(token, { url: 'sitio.com', motivo: 'me_cae_mal' });

    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('Por favor, seleccioná el motivo.');
    expect(unknown.status).toBe(400);
  });

  test('Acepta los cuatro motivos', async () => {
    const { token } = await registerAdult();

    for (const motivo of [
      'apuestas_ilegales',
      'publicidad_apuestas',
      'contenido_inapropiado',
      'otro'
    ]) {
      expect((await suggest(token, { url: `${motivo.replace(/_/g, '-')}.com`, motivo })).status).toBe(201);
    }
  });

  test('Información adicional de más de 500 caracteres → 400', async () => {
    const { token } = await registerAdult();

    const tooLong = await suggest(token, { url: 'sitio.com', motivo: 'otro', info: 'a'.repeat(501) });
    const justRight = await suggest(token, { url: 'sitio.com', motivo: 'otro', info: 'a'.repeat(500) });

    expect(tooLong.status).toBe(400);
    expect(justRight.status).toBe(201);
  });

  test('Más de 20 sugerencias en un día → 429; las de ayer no cuentan', async () => {
    const { token, responsibleId } = await registerAdult();
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    for (let i = 0; i < 5; i++) {
      db.siteSuggestions.push({
        id: `viejo-${i}`,
        responsibleId,
        domain: `viejo-${i}.com`,
        motivo: 'otro',
        createdAt: yesterday,
        status: 'pendiente'
      });
    }

    for (let i = 0; i < 20; i++) {
      expect((await suggest(token, { url: `sitio-${i}.com`, motivo: 'otro' })).status).toBe(201);
    }
    const limited = await suggest(token, { url: 'uno-mas.com', motivo: 'otro' });
    expect(limited.status).toBe(429);

    // El límite es por cuenta.
    const other = await registerAdult('otra@test.com');
    expect((await suggest(other.token, { url: 'uno-mas.com', motivo: 'otro' })).status).toBe(201);
  });

  test('Sin sesión → 401', async () => {
    const res = await request(app)
      .post('/api/blocklist/suggestions')
      .send({ url: 'sitio.com', motivo: 'otro' });

    expect(res.status).toBe(401);
  });

  test('Con credencial de celular ("Device") → 401', async () => {
    const res = await request(app)
      .post('/api/blocklist/suggestions')
      .set('Authorization', 'Device cualquier-cosa')
      .send({ url: 'sitio.com', motivo: 'otro' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/blocklist/suggestions (admin)', () => {
  test('Con x-admin-secret → lista las sugerencias, más nuevas primero', async () => {
    const { token } = await registerAdult();
    await suggest(token, { url: 'primero.com', motivo: 'otro' });
    db.siteSuggestions[0].createdAt = new Date(Date.now() - 60000).toISOString();
    await suggest(token, { url: 'segundo.com', motivo: 'publicidad_apuestas' });

    const res = await request(app)
      .get('/api/blocklist/suggestions')
      .set('x-admin-secret', ADMIN_SECRET);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.suggestions.map((s: any) => s.domain)).toEqual(['segundo.com', 'primero.com']);
  });

  test('Sin secreto o con el JWT de un adulto → 401', async () => {
    const { token } = await registerAdult();

    const none = await request(app).get('/api/blocklist/suggestions');
    const wrong = await request(app)
      .get('/api/blocklist/suggestions')
      .set('x-admin-secret', 'incorrecto');
    const adult = await request(app)
      .get('/api/blocklist/suggestions')
      .set('Authorization', `Bearer ${token}`);

    expect(none.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(adult.status).toBe(401);
  });

  test('Sin ADMIN_SECRET configurado → 503', async () => {
    delete process.env.ADMIN_SECRET;
    try {
      const res = await request(app)
        .get('/api/blocklist/suggestions')
        .set('x-admin-secret', ADMIN_SECRET);
      expect(res.status).toBe(503);
    } finally {
      process.env.ADMIN_SECRET = ADMIN_SECRET;
    }
  });
});
