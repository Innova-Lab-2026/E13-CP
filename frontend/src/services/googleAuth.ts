import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL, apiRequest } from "./api";
import { assertAuthResponse, startSession, type AuthResponse } from "./auth";

/**
 * Inicio de sesión con Google (OAuth 2.0 con código de autorización y PKCE).
 *
 * 1. La app genera el `code_verifier`, su `code_challenge` y un `state` propio,
 *    y los guarda en este dispositivo.
 * 2. Abre `/api/auth/google/start` del backend, que redirige a Google.
 * 3. Google vuelve al backend, que redirige a la app (`/auth/google`) con
 *    `code` y `state`.
 * 4. La app compara el `state` con el guardado y canjea el código en
 *    `POST /api/auth/google` junto con el `code_verifier`.
 */

export type GoogleAuthResponse = AuthResponse & {
  /** true si la cuenta se creó en este ingreso. */
  created: boolean;
};

export type GoogleLoginStart =
  /** Web: la página se va a Google y vuelve a /app/auth/google. */
  | { type: "redirect" }
  /** La persona cerró el navegador o canceló en Google. No es un error. */
  | { type: "cancel" }
  | { type: "success"; result: GoogleAuthResponse };

/** Error del ingreso con Google con un mensaje listo para mostrar. */
export class GoogleLoginError extends Error {
  /** true si la persona canceló en Google (no hace falta mostrarlo como error). */
  cancelled: boolean;

  constructor(message: string, cancelled = false) {
    super(message);
    this.name = "GoogleLoginError";
    this.cancelled = cancelled;
  }
}

/** Datos del intento en curso. En la web, AsyncStorage usa localStorage. */
type PendingGoogleLogin = {
  codeVerifier: string;
  state: string;
  createdAt: number;
};

const STORAGE_KEY = "ba-protege:google-oauth";

/** Vigencia del intento: igual que el `state` firmado del backend. */
const MAX_AGE_MS = 10 * 60 * 1000;

/** Ruta de la app a la que vuelve Google (en la web, debajo de experiments.baseUrl de app.json). */
const RETURN_PATH = "auth/google";
const WEB_BASE_PATH = "/app";

// ---------------------------------------------------------------------------
// ¿Está habilitado en el servidor?
// ---------------------------------------------------------------------------

let enabledCache: boolean | undefined;
let enabledRequest: Promise<boolean> | null = null;

/**
 * true si el backend tiene configurado el ingreso con Google. El resultado se
 * guarda en memoria; si la consulta falla devuelve false y se reintenta la próxima vez.
 */
export function isGoogleLoginEnabled(): Promise<boolean> {
  if (enabledCache !== undefined) {
    return Promise.resolve(enabledCache);
  }
  if (!enabledRequest) {
    enabledRequest = apiRequest<{ enabled?: unknown } | null>("/api/auth/google/config", {
      auth: false,
    })
      .then((data) => {
        enabledCache = data?.enabled === true;
        return enabledCache;
      })
      .catch(() => false)
      .finally(() => {
        enabledRequest = null;
      });
  }
  return enabledRequest;
}

/** Estado de React de isGoogleLoginEnabled(): null mientras se consulta. */
export function useGoogleLoginEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(enabledCache ?? null);

  useEffect(() => {
    let active = true;
    isGoogleLoginEnabled().then((value) => {
      if (active) setEnabled(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return enabled;
}

/**
 * En la web, si la persona vuelve con "Atrás" desde Google, el navegador puede
 * restaurar la página desde su caché (bfcache) con el estado de React intacto y
 * el botón de Google quedaría cargando para siempre. Llama a `reset` cuando eso pasa.
 */
export function useResetOnBackForwardRestore(reset: () => void): void {
  const resetRef = useRef(reset);
  resetRef.current = reset;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetRef.current();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);
}

// ---------------------------------------------------------------------------
// PKCE
// ---------------------------------------------------------------------------

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64url sin relleno (RFC 7636). */
function base64UrlFromBytes(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    output += BASE64_ALPHABET[(triple >> 18) & 63];
    output += BASE64_ALPHABET[(triple >> 12) & 63];
    if (i + 1 < bytes.length) output += BASE64_ALPHABET[(triple >> 6) & 63];
    if (i + 2 < bytes.length) output += BASE64_ALPHABET[triple & 63];
  }
  return base64ToBase64Url(output);
}

function base64ToBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createPkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  // 32 bytes aleatorios → 43 caracteres base64url.
  const codeVerifier = base64UrlFromBytes(Crypto.getRandomBytes(32));
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return { codeVerifier, codeChallenge: base64ToBase64Url(digest) };
}

// ---------------------------------------------------------------------------
// Intento guardado en el dispositivo
// ---------------------------------------------------------------------------

async function savePending(pending: PendingGoogleLogin): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    throw new GoogleLoginError(
      "No pudimos preparar el inicio de sesión con Google en este dispositivo. Probá de nuevo.",
    );
  }
}

/** Lee y borra el intento guardado: cada intento se usa una sola vez. */
async function takePending(): Promise<PendingGoogleLogin | null> {
  let pending: PendingGoogleLogin | null = null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    pending = raw ? (JSON.parse(raw) as PendingGoogleLogin) : null;
  } catch {
    pending = null;
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Si no se puede borrar, igual vence a los 10 minutos.
  }
  return pending;
}

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------

/** Dirección a la que el backend devuelve el resultado de Google. */
function returnUrl(): string {
  if (Platform.OS === "web") {
    return `${window.location.origin}${WEB_BASE_PATH}/${RETURN_PATH}`;
  }
  // Con el scheme "baprotege" de app.json: baprotege://auth/google
  return Linking.createURL(RETURN_PATH);
}

/** Lee code, state y error de la dirección con la que volvió la app. */
function paramsFromUrl(url: string): GoogleCallbackParams {
  const { queryParams } = Linking.parse(url);
  const pick = (key: string) => {
    const value = queryParams?.[key];
    return Array.isArray(value) ? value[0] : (value ?? undefined);
  };
  return { code: pick("code"), state: pick("state"), error: pick("error") };
}

/**
 * Empieza el ingreso con Google.
 * - Web: guarda el intento y lleva la página a Google (devuelve "redirect").
 * - Android: abre Google en el navegador del sistema y, si vuelve con un código,
 *   completa el ingreso. La ruta /auth/google también puede recibir la vuelta:
 *   completeGoogleLogin evita canjear dos veces el mismo código.
 */
export async function startGoogleLogin(): Promise<GoogleLoginStart> {
  const { codeVerifier, codeChallenge } = await createPkce();
  const state = base64UrlFromBytes(Crypto.getRandomBytes(16));
  const redirect = returnUrl();

  await savePending({ codeVerifier, state, createdAt: Date.now() });

  const query = [
    ["return_to", redirect],
    ["code_challenge", codeChallenge],
    ["state", state],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const startUrl = `${API_BASE_URL}/api/auth/google/start?${query}`;

  if (Platform.OS === "web") {
    window.location.assign(startUrl);
    return { type: "redirect" };
  }

  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirect);
  if (result.type !== "success" || !result.url) {
    // No se borra el intento: en Android la vuelta a la app puede llegar como
    // "dismiss" mientras la ruta /auth/google recibe el código y lo necesita.
    return { type: "cancel" };
  }

  try {
    const response = await completeGoogleLogin(paramsFromUrl(result.url));
    return { type: "success", result: response };
  } catch (error) {
    if (error instanceof GoogleLoginError && error.cancelled) {
      return { type: "cancel" };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Vuelta de Google
// ---------------------------------------------------------------------------

export type GoogleCallbackParams = {
  code?: string;
  state?: string;
  error?: string;
};

/** Canjes de este proceso, por código: un código de Google sirve una sola vez. */
const redemptions = new Map<string, Promise<GoogleAuthResponse>>();

/**
 * Completa el ingreso con lo que devolvió Google: valida el `state`, canjea el
 * código en el backend y guarda la sesión igual que el ingreso con contraseña.
 * Si el mismo código ya se está canjeando (o ya se canjeó), devuelve la misma promesa.
 */
export function completeGoogleLogin(
  params: GoogleCallbackParams,
): Promise<GoogleAuthResponse> {
  const { code } = params;
  if (code) {
    const existing = redemptions.get(code);
    if (existing) return existing;
  }

  const redemption = redeem(params);
  if (code) redemptions.set(code, redemption);
  return redemption;
}

async function redeem({ code, state, error }: GoogleCallbackParams): Promise<GoogleAuthResponse> {
  // Se borra siempre, salga bien o mal.
  const pending = await takePending();

  if (error) {
    if (error === "access_denied") {
      throw new GoogleLoginError("Cancelaste el inicio de sesión con Google.", true);
    }
    throw new GoogleLoginError(
      "Google no pudo completar el inicio de sesión. Probá de nuevo.",
    );
  }

  if (!code || !state) {
    throw new GoogleLoginError(
      "No recibimos la respuesta de Google. Probá de nuevo.",
    );
  }

  if (
    !pending ||
    typeof pending.codeVerifier !== "string" ||
    pending.state !== state ||
    typeof pending.createdAt !== "number" ||
    Date.now() - pending.createdAt > MAX_AGE_MS
  ) {
    throw new GoogleLoginError(
      "El inicio de sesión con Google venció o no es válido. Probá de nuevo desde este dispositivo.",
    );
  }

  const data = await apiRequest<unknown>("/api/auth/google", {
    method: "POST",
    body: { code, codeVerifier: pending.codeVerifier },
    auth: false,
  });
  const result: GoogleAuthResponse = {
    ...assertAuthResponse(data),
    created: (data as { created?: unknown }).created === true,
  };
  return startSession(result, "google");
}
