import { Request, Response } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { db, Responsible } from '../config/db';
import { signSessionToken, toPublicProfile } from './auth.controller';
import {
  appendQueryParams,
  buildGoogleAuthUrl,
  getGoogleConfig,
  isAllowedReturnUrl,
  isGoogleLoginEnabled,
  isValidAppState,
  isValidCodeChallenge,
  isValidCodeVerifier,
  signOAuthState,
  verifyOAuthState
} from '../services/googleOAuth.service';

const NOT_CONFIGURED_ERROR = 'El inicio de sesión con Google no está configurado';
const GOOGLE_VALIDATION_ERROR = 'No pudimos validar tu cuenta de Google. Probá de nuevo.';
const UNVERIFIED_EMAIL_ERROR = 'Tu cuenta de Google no tiene el correo verificado';
const PASSWORD_ACCOUNT_EXISTS_ERROR =
  'Ya existe una cuenta con este correo. Entrá con tu correo y contraseña.';
const MAX_CODE_LENGTH = 2048;
/** Los errores de OAuth son códigos cortos ("access_denied"); cualquier otra cosa se normaliza. */
const OAUTH_ERROR_REGEX = /^[a-z_]{1,64}$/;

/**
 * GET /api/auth/google/config
 * Indica si el inicio de sesión con Google está disponible, para que la app
 * muestre u oculte el botón "Continuar con Google".
 */
export const getGoogleLoginConfig = (_req: Request, res: Response) =>
  res.status(200).json({ enabled: isGoogleLoginEnabled() });

/**
 * GET /api/auth/google/start?return_to=&code_challenge=&state=
 * Valida los parámetros de la app y redirige a la pantalla de consentimiento de
 * Google con PKCE. La URL de retorno y el state de la app viajan dentro de un
 * state firmado por el backend.
 */
export const startGoogleLogin = (req: Request, res: Response) => {
  const config = getGoogleConfig();
  if (!config) {
    return res.status(503).json({ error: NOT_CONFIGURED_ERROR });
  }

  const { return_to: returnTo, code_challenge: codeChallenge, state } = req.query;

  if (!isAllowedReturnUrl(returnTo)) {
    return res.status(400).json({ error: 'La URL de retorno no está permitida' });
  }

  if (!isValidCodeChallenge(codeChallenge)) {
    return res.status(400).json({ error: 'El code_challenge no es válido' });
  }

  if (!isValidAppState(state)) {
    return res.status(400).json({ error: 'El state no es válido' });
  }

  const signedState = signOAuthState({ returnTo, appState: state });

  res.set('Cache-Control', 'no-store');
  return res.redirect(302, buildGoogleAuthUrl(config, { codeChallenge, state: signedState }));
};

/** Página mínima para cuando el callback no puede volver a la app. */
const renderCallbackError = (res: Response) =>
  res
    .status(400)
    .set('Cache-Control', 'no-store')
    .type('html')
    .send(
      '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>BA Protege+</title></head><body style="font-family:sans-serif;padding:24px">' +
        '<h1>No pudimos completar el inicio de sesión</h1>' +
        '<p>El enlace para entrar con Google venció o no es válido. ' +
        'Volvé a la app y probá de nuevo.</p></body></html>'
    );

/**
 * GET /api/auth/google/callback?code=&state= (o ?error=)
 * Google vuelve acá. Se verifica el state firmado y se reenvía el código (o el
 * error) a la app junto con su propio state. No crea usuarios: el canje del
 * código lo hace la app en POST /api/auth/google con su code_verifier.
 */
export const googleCallback = (req: Request, res: Response) => {
  const oauthState = verifyOAuthState(req.query.state);
  if (!oauthState) {
    return renderCallbackError(res);
  }

  const { code, error } = req.query;
  let params: Record<string, string>;

  if (typeof error === 'string' && error) {
    params = { error: OAUTH_ERROR_REGEX.test(error) ? error : 'unknown_error' };
  } else if (typeof code === 'string' && code && code.length <= MAX_CODE_LENGTH) {
    params = { code };
  } else {
    params = { error: 'invalid_request' };
  }

  res.set('Cache-Control', 'no-store');
  return res.redirect(
    302,
    appendQueryParams(oauthState.returnTo, { ...params, state: oauthState.appState })
  );
};

/** Canjea el código con PKCE y devuelve los datos verificados del id_token. */
const exchangeCode = async (code: string, codeVerifier: string): Promise<TokenPayload | null> => {
  const config = getGoogleConfig();
  if (!config) return null;

  const client = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri
  });

  const { tokens } = await client.getToken({ code, codeVerifier });
  if (!tokens.id_token) {
    return null;
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
  return ticket.getPayload() ?? null;
};

/**
 * POST /api/auth/google
 * Body: { code, codeVerifier }
 * Canjea el código de Google, verifica el id_token y entra con la cuenta
 * vinculada a ese usuario de Google. Si no hay, crea una nueva sin contraseña.
 * Si ya existe una cuenta con contraseña y el mismo correo responde 409: esa
 * cuenta no se vincula sola porque su correo nunca se verificó. Emite el mismo
 * JWT que el login con contraseña.
 */
export const loginWithGoogle = async (req: Request, res: Response) => {
  try {
    if (!isGoogleLoginEnabled()) {
      return res.status(503).json({ error: NOT_CONFIGURED_ERROR });
    }

    const { code, codeVerifier } = (req.body ?? {}) as { code?: unknown; codeVerifier?: unknown };

    if (typeof code !== 'string' || !code || code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({ error: 'El código de Google es obligatorio' });
    }

    if (!isValidCodeVerifier(codeVerifier)) {
      return res.status(400).json({ error: 'El codeVerifier no es válido' });
    }

    let payload: TokenPayload | null;
    try {
      payload = await exchangeCode(code, codeVerifier);
    } catch (error) {
      console.warn('[google] no se pudo canjear el código', error instanceof Error ? error.message : error);
      return res.status(401).json({ error: GOOGLE_VALIDATION_ERROR });
    }

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: GOOGLE_VALIDATION_ERROR });
    }

    const email = payload.email?.trim().toLowerCase();
    if (!email || payload.email_verified !== true) {
      return res.status(401).json({ error: UNVERIFIED_EMAIL_ERROR });
    }

    let responsible = db.responsables.find(r => r.googleSub === payload!.sub);
    let created = false;

    if (!responsible) {
      const byEmail = db.responsables.find(r => r.email === email);

      if (byEmail) {
        if (byEmail.googleSub && byEmail.googleSub !== payload.sub) {
          return res.status(409).json({
            error: 'Esta cuenta ya está vinculada a otra cuenta de Google'
          });
        }

        // El registro con contraseña no verifica el correo: cualquiera pudo crear
        // esa cuenta antes que la persona dueña del correo y conservar la
        // contraseña. Por eso no se vincula Google en silencio.
        if (byEmail.passwordHash) {
          return res.status(409).json({ error: PASSWORD_ACCOUNT_EXISTS_ERROR });
        }

        byEmail.googleSub = payload.sub;
        responsible = byEmail;
      } else {
        const newResponsible: Responsible = {
          id: uuidv4(),
          email,
          googleSub: payload.sub,
          name: payload.name?.trim() || email.split('@')[0],
          rol: 'responsable',
          mode: 'adulto',
          createdAt: new Date().toISOString()
        };

        db.responsables.push(newResponsible);
        responsible = newResponsible;
        created = true;
      }
    }

    return res.status(created ? 201 : 200).json({
      message: created ? 'Responsible registered with Google' : 'Login with Google successful',
      token: signSessionToken(responsible),
      responsible: toPublicProfile(responsible),
      created
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
