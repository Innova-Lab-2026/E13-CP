import crypto from 'crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import app from '../index';
import { db } from '../config/db';
import { JWT_SECRET } from '../middleware/auth.middleware';

// No se llama a Google: el cliente OAuth se reemplaza por dobles de prueba.
const mockGetToken = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    getToken: mockGetToken,
    verifyIdToken: mockVerifyIdToken
  }))
}));

const GOOGLE_ENV = {
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback'
};
const ENV_KEYS = [...Object.keys(GOOGLE_ENV), 'GOOGLE_RETURN_URL_PREFIXES', 'VERCEL'];
const originalEnv: Record<string, string | undefined> = {};

const base64url = (buffer: Buffer) => buffer.toString('base64url');
const CODE_VERIFIER = base64url(crypto.randomBytes(32));
const CODE_CHALLENGE = base64url(crypto.createHash('sha256').update(CODE_VERIFIER).digest());
const APP_STATE = crypto.randomBytes(16).toString('hex');
const ANDROID_RETURN = 'baprotege://auth/google';
const WEB_RETURN = 'https://baprotege.vercel.app/app/auth/google';

const GOOGLE_USER = {
  sub: '1098765432101234567890',
  email: 'laura.google@gmail.com',
  email_verified: true,
  name: 'Laura Google'
};

/** Hace que el canje del código devuelva un id_token con estos datos. */
const mockGoogleUser = (payload: Record<string, unknown>) => {
  mockGetToken.mockResolvedValue({ tokens: { id_token: 'fake-id-token' } });
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload });
};

const startQuery = (overrides: Record<string, string> = {}) => ({
  return_to: ANDROID_RETURN,
  code_challenge: CODE_CHALLENGE,
  state: APP_STATE,
  ...overrides
});

/** Arranca el flujo y devuelve el state firmado que el backend le manda a Google. */
const signedStateFrom = async (returnTo = ANDROID_RETURN) => {
  const res = await request(app).get('/api/auth/google/start').query(startQuery({ return_to: returnTo }));
  return new URL(res.headers.location).searchParams.get('state') as string;
};

const postGoogle = (body: Record<string, unknown> = { code: '4/0Afake-code', codeVerifier: CODE_VERIFIER }) =>
  request(app).post('/api/auth/google').send(body);

beforeAll(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

beforeEach(() => {
  Object.assign(process.env, GOOGLE_ENV);
  delete process.env.GOOGLE_RETURN_URL_PREFIXES;
  delete process.env.VERCEL;
  (OAuth2Client as unknown as jest.Mock).mockClear();
  mockGetToken.mockReset();
  mockVerifyIdToken.mockReset();
  db.responsables = [];
  db.devices = [];
  db.events = [];
  db.alerts = [];
  db.blocklist = db.blocklist.filter(item => item.type === 'LOTBA_OFFICIAL');
});

describe('GET /api/auth/google/config', () => {
  test('enabled: true con las tres variables configuradas', async () => {
    const res = await request(app).get('/api/auth/google/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: true });
  });

  test('enabled: false si falta alguna variable, y start y el canje responden 503', async () => {
    delete process.env.GOOGLE_CLIENT_SECRET;

    const config = await request(app).get('/api/auth/google/config');
    expect(config.body).toEqual({ enabled: false });

    const start = await request(app).get('/api/auth/google/start').query(startQuery());
    expect(start.status).toBe(503);
    expect(start.body.error).toBe('El inicio de sesión con Google no está configurado');

    const exchange = await postGoogle();
    expect(exchange.status).toBe(503);
    expect(mockGetToken).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/google/start', () => {
  test('redirige a Google con PKCE, el cliente y un state firmado', async () => {
    const res = await request(app).get('/api/auth/google/start').query(startQuery());

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(`${location.origin}${location.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth');

    const params = location.searchParams;
    expect(params.get('client_id')).toBe(GOOGLE_ENV.GOOGLE_CLIENT_ID);
    expect(params.get('redirect_uri')).toBe(GOOGLE_ENV.GOOGLE_REDIRECT_URI);
    expect(params.get('response_type')).toBe('code');
    expect(params.get('scope')).toBe('openid email profile');
    expect(params.get('code_challenge')).toBe(CODE_CHALLENGE);
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.get('prompt')).toBe('select_account');

    // El state que viaja a Google es un JWT propio con la URL de retorno y el state de la app.
    const state = jwt.verify(params.get('state') as string, JWT_SECRET) as jwt.JwtPayload;
    expect(state.typ).toBe('google_oauth_state');
    expect(state.returnTo).toBe(ANDROID_RETURN);
    expect(state.appState).toBe(APP_STATE);
    expect(state.exp! - state.iat!).toBe(10 * 60);
  });

  test('acepta la URL de retorno de la web app', async () => {
    const res = await request(app).get('/api/auth/google/start').query(startQuery({ return_to: WEB_RETURN }));
    expect(res.status).toBe(302);
  });

  test.each([
    'https://baprotege.vercel.app.evil.com/app/',
    'javascript:alert(1)',
    'https://evil.com/app/auth/google',
    'http://localhost:8081.evil.com/',
    'baprotege-evil://auth/google',
    'baprotege://otra-ruta',
    'https://baprotege.vercel.app/app/',
    'https://baprotege.vercel.app/app/otra-ruta',
    'https://baprotege.vercel.app/app/auth/google#x'
  ])('rechaza return_to fuera de la allowlist: %s', async returnTo => {
    const res = await request(app).get('/api/auth/google/start').query(startQuery({ return_to: returnTo }));
    expect(res.status).toBe(400);
    expect(res.headers.location).toBeUndefined();
  });

  test('acepta Expo web en localhost solo fuera de producción', async () => {
    const localReturn = 'http://localhost:8081/app/auth/google';

    const dev = await request(app).get('/api/auth/google/start').query(startQuery({ return_to: localReturn }));
    expect(dev.status).toBe(302);

    process.env.VERCEL = '1';

    const prod = await request(app).get('/api/auth/google/start').query(startQuery({ return_to: localReturn }));
    expect(prod.status).toBe(400);

    // Las rutas de la app siguen permitidas en producción.
    const android = await request(app).get('/api/auth/google/start').query(startQuery());
    expect(android.status).toBe(302);
    const web = await request(app).get('/api/auth/google/start').query(startQuery({ return_to: WEB_RETURN }));
    expect(web.status).toBe(302);
  });

  test('respeta GOOGLE_RETURN_URL_PREFIXES y fija el host aunque falte la barra final', async () => {
    process.env.GOOGLE_RETURN_URL_PREFIXES = 'https://preview.example.com';

    const allowed = await request(app)
      .get('/api/auth/google/start')
      .query(startQuery({ return_to: 'https://preview.example.com/app/auth/google' }));
    expect(allowed.status).toBe(302);

    const lookalike = await request(app)
      .get('/api/auth/google/start')
      .query(startQuery({ return_to: 'https://preview.example.com.evil.com/' }));
    expect(lookalike.status).toBe(400);

    // Los prefijos por defecto dejan de valer.
    const android = await request(app).get('/api/auth/google/start').query(startQuery());
    expect(android.status).toBe(400);
  });

  test('rechaza un code_challenge o un state inválidos', async () => {
    const shortChallenge = await request(app)
      .get('/api/auth/google/start')
      .query(startQuery({ code_challenge: 'corto' }));
    expect(shortChallenge.status).toBe(400);

    const badChars = await request(app)
      .get('/api/auth/google/start')
      .query(startQuery({ code_challenge: `${CODE_CHALLENGE.slice(0, 42)}+/=` }));
    expect(badChars.status).toBe(400);

    const badState = await request(app)
      .get('/api/auth/google/start')
      .query(startQuery({ state: 'no válido' }));
    expect(badState.status).toBe(400);

    const longState = await request(app)
      .get('/api/auth/google/start')
      .query(startQuery({ state: 'a'.repeat(201) }));
    expect(longState.status).toBe(400);
  });
});

describe('GET /api/auth/google/callback', () => {
  test('con un state inválido responde 400 sin redirigir', async () => {
    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: '4/0Afake-code', state: 'no-es-un-jwt' });

    expect(res.status).toBe(400);
    expect(res.headers.location).toBeUndefined();
    expect(res.text).toContain('No pudimos completar el inicio de sesión');
  });

  test('con un state vencido o de otro tipo responde 400', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = jwt.sign(
      { typ: 'google_oauth_state', returnTo: ANDROID_RETURN, appState: APP_STATE, iat: now - 1200, exp: now - 600 },
      JWT_SECRET
    );
    const expiredRes = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: '4/0Afake-code', state: expired });
    expect(expiredRes.status).toBe(400);

    // Un JWT de sesión firmado con la misma clave no sirve como state.
    const sessionLike = jwt.sign({ id: 'x', email: 'a@b.com', rol: 'responsable' }, JWT_SECRET);
    const sessionRes = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: '4/0Afake-code', state: sessionLike });
    expect(sessionRes.status).toBe(400);

    // Ni uno firmado con otra clave.
    const forged = jwt.sign(
      { typ: 'google_oauth_state', returnTo: ANDROID_RETURN, appState: APP_STATE },
      'otra-clave'
    );
    const forgedRes = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: '4/0Afake-code', state: forged });
    expect(forgedRes.status).toBe(400);
  });

  test('con un state válido reenvía el código y el state de la app a la URL de retorno', async () => {
    const state = await signedStateFrom();

    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: '4/0Afake-code', state, scope: 'openid email profile' });

    expect(res.status).toBe(302);
    expect(res.headers.location.startsWith(`${ANDROID_RETURN}?`)).toBe(true);
    const params = new URLSearchParams(res.headers.location.split('?')[1]);
    expect(params.get('code')).toBe('4/0Afake-code');
    expect(params.get('state')).toBe(APP_STATE);
    expect(params.get('error')).toBeNull();

    // El callback no crea ni modifica cuentas.
    expect(db.responsables).toHaveLength(0);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  test('también vuelve a la web app', async () => {
    const state = await signedStateFrom(WEB_RETURN);

    const res = await request(app).get('/api/auth/google/callback').query({ code: 'abc', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${WEB_RETURN}?code=abc&state=${APP_STATE}`);
  });

  test('si Google devuelve error=access_denied lo reenvía a la app', async () => {
    const state = await signedStateFrom();

    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ error: 'access_denied', state });

    expect(res.status).toBe(302);
    const params = new URLSearchParams(res.headers.location.split('?')[1]);
    expect(params.get('error')).toBe('access_denied');
    expect(params.get('state')).toBe(APP_STATE);
    expect(params.get('code')).toBeNull();
  });

  test('sin código ni error reenvía error=invalid_request', async () => {
    const state = await signedStateFrom();

    const res = await request(app).get('/api/auth/google/callback').query({ state });

    expect(res.status).toBe(302);
    const params = new URLSearchParams(res.headers.location.split('?')[1]);
    expect(params.get('error')).toBe('invalid_request');
    expect(params.get('state')).toBe(APP_STATE);
    expect(params.get('code')).toBeNull();
  });

  test('un error con otro formato se reenvía como unknown_error', async () => {
    const state = await signedStateFrom();

    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ error: '<script>alert(1)</script>', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).not.toContain('script');
    const params = new URLSearchParams(res.headers.location.split('?')[1]);
    expect(params.get('error')).toBe('unknown_error');
    expect(params.get('state')).toBe(APP_STATE);
  });
});

describe('POST /api/auth/google', () => {
  test('crea una cuenta sin contraseña con los datos de Google (201)', async () => {
    mockGoogleUser(GOOGLE_USER);

    const res = await postGoogle();

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.responsible).toMatchObject({
      email: GOOGLE_USER.email,
      name: GOOGLE_USER.name,
      rol: 'responsable',
      mode: 'adulto',
      hasPin: false,
      hasPassword: false,
      authProviders: ['google']
    });
    expect(res.body.responsible.googleSub).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(GOOGLE_USER.sub);

    // Mismo JWT que el login con contraseña.
    const payload = jwt.verify(res.body.token, JWT_SECRET) as jwt.JwtPayload;
    expect(payload).toMatchObject({ id: res.body.responsible.id, email: GOOGLE_USER.email, rol: 'responsable' });
    expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);

    // El cliente se arma con el secreto y la misma redirect_uri que usó /start.
    expect(OAuth2Client).toHaveBeenCalledWith({
      clientId: GOOGLE_ENV.GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_ENV.GOOGLE_CLIENT_SECRET,
      redirectUri: GOOGLE_ENV.GOOGLE_REDIRECT_URI
    });
    expect(mockGetToken).toHaveBeenCalledWith({ code: '4/0Afake-code', codeVerifier: CODE_VERIFIER });
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'fake-id-token',
      audience: GOOGLE_ENV.GOOGLE_CLIENT_ID
    });

    const stored = db.responsables[0];
    expect(stored.googleSub).toBe(GOOGLE_USER.sub);
    expect(stored.passwordHash).toBeUndefined();

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.hasPassword).toBe(false);
  });

  test('sin nombre en Google usa la parte local del correo', async () => {
    mockGoogleUser({ ...GOOGLE_USER, name: undefined });

    const res = await postGoogle();

    expect(res.status).toBe(201);
    expect(res.body.responsible.name).toBe('laura.google');
  });

  test('un segundo ingreso con el mismo usuario de Google entra a la misma cuenta (200)', async () => {
    mockGoogleUser(GOOGLE_USER);
    const first = await postGoogle();

    // Aunque cambie el correo en Google, manda el sub.
    mockGoogleUser({ ...GOOGLE_USER, email: 'otro.correo@gmail.com' });
    const second = await postGoogle({ code: '4/0Aotro-code', codeVerifier: CODE_VERIFIER });

    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(second.body.responsible.id).toBe(first.body.responsible.id);
    expect(db.responsables).toHaveLength(1);
  });

  test('no vincula sola una cuenta con contraseña que tiene el mismo correo (409)', async () => {
    // El registro no verifica el correo: la cuenta pudo crearla otra persona.
    await request(app).post('/api/auth/register').send({
      name: 'Quien se adelantó',
      email: GOOGLE_USER.email,
      password: 'password123'
    });

    mockGoogleUser({ ...GOOGLE_USER, email: 'Laura.Google@Gmail.com' });
    const res = await postGoogle();

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe una cuenta con este correo. Entrá con tu correo y contraseña.');
    expect(res.body.token).toBeUndefined();
    expect(db.responsables).toHaveLength(1);
    expect(db.responsables[0].googleSub).toBeUndefined();

    // La cuenta queda como estaba.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: GOOGLE_USER.email, password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.responsible.authProviders).toEqual(['password']);
  });

  test('no vincula una cuenta que ya está vinculada a otro usuario de Google', async () => {
    mockGoogleUser(GOOGLE_USER);
    await postGoogle();

    mockGoogleUser({ ...GOOGLE_USER, sub: '5555555555' });
    const res = await postGoogle();

    expect(res.status).toBe(409);
    expect(db.responsables).toHaveLength(1);
    expect(db.responsables[0].googleSub).toBe(GOOGLE_USER.sub);
  });

  test('rechaza un correo no verificado', async () => {
    mockGoogleUser({ ...GOOGLE_USER, email_verified: false });

    const res = await postGoogle();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Tu cuenta de Google no tiene el correo verificado');
    expect(db.responsables).toHaveLength(0);
  });

  test('no vincula por correo si Google no lo verificó', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Laura Responsable',
      email: GOOGLE_USER.email,
      password: 'password123'
    });
    mockGoogleUser({ ...GOOGLE_USER, email_verified: undefined });

    const res = await postGoogle();

    expect(res.status).toBe(401);
    expect(db.responsables[0].googleSub).toBeUndefined();
  });

  test('si Google rechaza el código responde 401', async () => {
    mockGetToken.mockRejectedValue(new Error('invalid_grant'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await postGoogle();

    warn.mockRestore();
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No pudimos validar tu cuenta de Google. Probá de nuevo.');
    expect(db.responsables).toHaveLength(0);
  });

  test('si el id_token no verifica responde 401', async () => {
    mockGetToken.mockResolvedValue({ tokens: { id_token: 'fake-id-token' } });
    mockVerifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await postGoogle();

    warn.mockRestore();
    expect(res.status).toBe(401);
  });

  test('valida el código y el codeVerifier', async () => {
    const noCode = await postGoogle({ codeVerifier: CODE_VERIFIER });
    expect(noCode.status).toBe(400);

    const shortVerifier = await postGoogle({ code: 'abc', codeVerifier: 'corto' });
    expect(shortVerifier.status).toBe(400);

    expect(mockGetToken).not.toHaveBeenCalled();
  });
});

describe('Cuentas creadas con Google', () => {
  const createGoogleAccount = async (): Promise<string> => {
    mockGoogleUser(GOOGLE_USER);
    const res = await postGoogle();
    return res.body.token as string;
  };

  test('el login con contraseña indica que hay que entrar con Google', async () => {
    await createGoogleAccount();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: GOOGLE_USER.email, password: 'cualquier-cosa' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Esta cuenta usa Google. Entrá con "Continuar con Google".');
  });

  test('registrarse con contraseña usando el mismo correo sigue dando 400', async () => {
    await createGoogleAccount();

    const res = await request(app).post('/api/auth/register').send({
      name: 'Otra Persona',
      email: GOOGLE_USER.email,
      password: 'password123'
    });

    expect(res.status).toBe(400);
  });

  test('eliminar la cuenta exige el PIN de seguridad', async () => {
    const token = await createGoogleAccount();
    const del = (body: Record<string, unknown>) =>
      request(app).delete('/api/auth/me').set('Authorization', `Bearer ${token}`).send(body);

    // Sin PIN configurado no hay con qué confirmar.
    const noPinConfigured = await del({ pin: '1234' });
    expect(noPinConfigured.status).toBe(409);

    await request(app).patch('/api/auth/pin').set('Authorization', `Bearer ${token}`).send({ pin: '4829' });

    const missing = await del({});
    expect(missing.status).toBe(400);

    const withPassword = await del({ password: 'password123' });
    expect(withPassword.status).toBe(400);

    const badFormat = await del({ pin: '12a4' });
    expect(badFormat.status).toBe(400);

    const wrong = await del({ pin: '0000' });
    expect(wrong.status).toBe(401);
    expect(db.responsables).toHaveLength(1);

    const ok = await del({ pin: '4829' });
    expect(ok.status).toBe(200);
    expect(db.responsables).toHaveLength(0);
  });

  test('cambiar el PIN exige el PIN actual, así no se puede pisar solo con la sesión', async () => {
    const token = await createGoogleAccount();
    const auth = { Authorization: `Bearer ${token}` };

    const first = await request(app).patch('/api/auth/pin').set(auth).send({ pin: '4829' });
    expect(first.status).toBe(200);

    const withoutCurrent = await request(app).patch('/api/auth/pin').set(auth).send({ pin: '0000' });
    expect(withoutCurrent.status).toBe(400);

    const wrongCurrent = await request(app)
      .patch('/api/auth/pin')
      .set(auth)
      .send({ pin: '0000', currentPin: '1111' });
    expect(wrongCurrent.status).toBe(401);

    // El PIN viejo sigue siendo el que vale para eliminar la cuenta.
    const deleteWithNew = await request(app).delete('/api/auth/me').set(auth).send({ pin: '0000' });
    expect(deleteWithNew.status).toBe(401);

    const changed = await request(app)
      .patch('/api/auth/pin')
      .set(auth)
      .send({ pin: '5173', currentPin: '4829' });
    expect(changed.status).toBe(200);

    const deleted = await request(app).delete('/api/auth/me').set(auth).send({ pin: '5173' });
    expect(deleted.status).toBe(200);
  });

  test('después de 5 PIN incorrectos el PIN queda bloqueado 15 minutos', async () => {
    const token = await createGoogleAccount();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).patch('/api/auth/pin').set(auth).send({ pin: '4829' });
    const del = (pin: string) => request(app).delete('/api/auth/me').set(auth).send({ pin });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await del('0000');
      expect(res.status).toBe(401);
    }

    const fifth = await del('0000');
    expect(fifth.status).toBe(429);
    expect(fifth.body.error).toBe('Ingresaste mal el PIN demasiadas veces. Probá de nuevo en 15 minutos.');

    // Bloqueado, ni el PIN correcto pasa, en ninguna de las pantallas que lo piden.
    const correctWhileLocked = await del('4829');
    expect(correctWhileLocked.status).toBe(429);
    const verifyWhileLocked = await request(app).post('/api/auth/pin/verify').set(auth).send({ pin: '4829' });
    expect(verifyWhileLocked.status).toBe(429);
    expect(db.responsables).toHaveLength(1);

    // Vencido el bloqueo, el PIN correcto vuelve a funcionar.
    db.responsables[0].pinLockedUntil = new Date(Date.now() - 1000).toISOString();
    const ok = await del('4829');
    expect(ok.status).toBe(200);
    expect(db.responsables).toHaveLength(0);
  });

  test('un PIN correcto reinicia el contador de intentos', async () => {
    const token = await createGoogleAccount();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).patch('/api/auth/pin').set(auth).send({ pin: '4829' });
    const verify = (pin: string) => request(app).post('/api/auth/pin/verify').set(auth).send({ pin });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect((await verify('0000')).status).toBe(401);
    }
    expect((await verify('4829')).status).toBe(200);
    expect((await verify('0000')).status).toBe(401);
    expect(db.responsables[0].pinLockedUntil).toBeUndefined();
  });

  test('una cuenta con contraseña sigue pidiendo la contraseña y no el PIN', async () => {
    const register = await request(app).post('/api/auth/register').send({
      name: 'Laura Responsable',
      email: GOOGLE_USER.email,
      password: 'password123'
    });
    const token = register.body.token as string;
    await request(app).patch('/api/auth/pin').set('Authorization', `Bearer ${token}`).send({ pin: '4829' });

    const withPin = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '4829' });
    expect(withPin.status).toBe(400);

    const ok = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'password123' });
    expect(ok.status).toBe(200);
  });
});
