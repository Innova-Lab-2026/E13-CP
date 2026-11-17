import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.middleware';

/**
 * Helpers del inicio de sesión con Google (OAuth 2.0 authorization code + PKCE).
 *
 * El backend es el cliente confidencial de un único cliente OAuth tipo
 * "Web application" de Google: arma la URL de consentimiento, recibe el
 * callback de Google y reenvía el código a la app (web o Android), que después
 * lo canjea en POST /api/auth/google junto con su code_verifier.
 */

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_SCOPES = 'openid email profile';

/**
 * Prefijos permitidos por defecto para `return_to`: la ruta /auth/google de la
 * app Android y de la web app. Apuntan a la ruta exacta y no a todo el sitio.
 */
export const DEFAULT_RETURN_URL_PREFIXES = [
  'baprotege://auth/google',
  'https://baprotege.vercel.app/app/auth/google'
];

/**
 * Expo web en local. Solo se acepta fuera de producción: en un celular o una
 * computadora, cualquier proceso que escuche en ese puerto recibiría el código
 * de un flujo que arrancó él mismo (con su propio PKCE).
 */
export const DEV_RETURN_URL_PREFIXES = ['http://localhost:8081/'];

const isProduction = (): boolean =>
  process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

const STATE_TYPE = 'google_oauth_state';
const STATE_TTL = '10m';
const MAX_RETURN_URL_LENGTH = 2048;

/** code_challenge S256: base64url sin relleno, entre 43 y 128 caracteres (RFC 7636). */
const CODE_CHALLENGE_REGEX = /^[A-Za-z0-9_-]{43,128}$/;
/** code_verifier: caracteres "unreserved" de RFC 7636, entre 43 y 128. */
const CODE_VERIFIER_REGEX = /^[A-Za-z0-9._~-]{43,128}$/;
/** state de la app: base64url o hexadecimal, hasta 200 caracteres. */
const APP_STATE_REGEX = /^[A-Za-z0-9_-]{1,200}$/;
/** Espacios, caracteres de control y la barra invertida no tienen lugar en una URL de retorno. */
const UNSAFE_URL_CHARS_REGEX = /[\s\\\u0000-\u001f\u007f]/;

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Configuración del cliente OAuth. Se lee en cada uso (y no al importar) para
 * respetar el .env que carga index.ts. Devuelve `null` si falta alguna variable.
 */
export const getGoogleConfig = (): GoogleConfig | null => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
};

export const isGoogleLoginEnabled = (): boolean => getGoogleConfig() !== null;

/**
 * Prefijos de `return_to` aceptados (GOOGLE_RETURN_URL_PREFIXES, separados por
 * coma). Un prefijo http(s) que es solo el origen (sin ruta) se completa con
 * "/", así el host queda fijo y "https://baprotege.vercel.app.evil.com" no pasa.
 * Sin la variable se usan los prefijos por defecto y, fuera de producción,
 * también el de Expo web en local.
 */
export const getReturnUrlPrefixes = (): string[] => {
  const raw = process.env.GOOGLE_RETURN_URL_PREFIXES;
  const prefixes = raw
    ? raw.split(',').map(prefix => prefix.trim()).filter(Boolean)
    : [...DEFAULT_RETURN_URL_PREFIXES, ...(isProduction() ? [] : DEV_RETURN_URL_PREFIXES)];

  return prefixes.map(prefix => (/^https?:\/\/[^/]+$/i.test(prefix) ? `${prefix}/` : prefix));
};

/** Valida la URL a la que se devuelve el código contra la lista de prefijos permitidos. */
export const isAllowedReturnUrl = (returnTo: unknown): returnTo is string => {
  if (typeof returnTo !== 'string' || !returnTo || returnTo.length > MAX_RETURN_URL_LENGTH) {
    return false;
  }

  // Sin fragmento: los parámetros se agregan al final de la URL.
  if (UNSAFE_URL_CHARS_REGEX.test(returnTo) || returnTo.includes('#')) {
    return false;
  }

  return getReturnUrlPrefixes().some(prefix => returnTo.startsWith(prefix));
};

export const isValidCodeChallenge = (value: unknown): value is string =>
  typeof value === 'string' && CODE_CHALLENGE_REGEX.test(value);

export const isValidCodeVerifier = (value: unknown): value is string =>
  typeof value === 'string' && CODE_VERIFIER_REGEX.test(value);

export const isValidAppState = (value: unknown): value is string =>
  typeof value === 'string' && APP_STATE_REGEX.test(value);

export interface OAuthState {
  returnTo: string;
  appState: string;
}

/**
 * Firma el `state` que viaja a Google: un JWT HS256 de 10 minutos con la URL de
 * retorno y el state de la app. Así el callback no necesita guardar nada.
 */
export const signOAuthState = (state: OAuthState): string =>
  jwt.sign({ typ: STATE_TYPE, returnTo: state.returnTo, appState: state.appState }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: STATE_TTL
  });

/**
 * Verifica firma, vencimiento y tipo del `state` que devuelve Google.
 * Revalida la URL de retorno por si la allowlist cambió en el medio.
 * Devuelve `null` si no es válido.
 */
export const verifyOAuthState = (token: unknown): OAuthState | null => {
  if (typeof token !== 'string' || !token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (
      typeof payload !== 'object' ||
      payload === null ||
      payload.typ !== STATE_TYPE ||
      !isAllowedReturnUrl(payload.returnTo) ||
      !isValidAppState(payload.appState)
    ) {
      return null;
    }

    return { returnTo: payload.returnTo, appState: payload.appState };
  } catch {
    return null;
  }
};

/** URL de consentimiento de Google, con PKCE (S256) y el state firmado. */
export const buildGoogleAuthUrl = (
  config: GoogleConfig,
  params: { codeChallenge: string; state: string }
): string => {
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  });

  return `${GOOGLE_AUTH_URL}?${query.toString()}`;
};

/**
 * Agrega parámetros a la URL de retorno. No usa `new URL()` porque el esquema
 * propio de la app ("baprotege://") no siempre se normaliza igual.
 */
export const appendQueryParams = (url: string, params: Record<string, string>): string => {
  const query = new URLSearchParams(params).toString();
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
};
