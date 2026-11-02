import { ApiError, apiRequest } from "./api";
import {
  clearSession,
  loadDeviceBinding,
  loadSession,
  saveSession,
  updateSession,
} from "./session";

/** Perfil del usuario devuelto por la API. */
export type UserRole = "responsable" | "tutor";

/** Modo de uso elegido en la pantalla "Selección de Modo". */
export type UserMode = "adulto" | "dispositivo_protegido";

export type ResponsibleProfile = {
  id: string;
  email: string;
  name: string;
  rol: UserRole;
  mode: UserMode;
  telefono?: string;
  /** true si el adulto ya configuró su PIN de seguridad. */
  hasPin?: boolean;
  createdAt?: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  responsible: ResponsibleProfile;
};

function assertAuthResponse(data: unknown): AuthResponse {
  const body = data as Partial<AuthResponse> | null;
  const responsible = body?.responsible as Partial<ResponsibleProfile> | undefined;
  if (
    !body ||
    typeof body.token !== "string" ||
    !responsible ||
    typeof responsible.id !== "string" ||
    typeof responsible.email !== "string" ||
    typeof responsible.name !== "string"
  ) {
    throw new Error("El servidor devolvió una respuesta de autenticación no válida.");
  }
  return body as AuthResponse;
}

/**
 * Guarda la sesión del adulto. El modo y el perfil vinculado son propios de este
 * dispositivo, así que se conservan si la misma cuenta vuelve a iniciar sesión.
 */
async function startSession(result: AuthResponse): Promise<AuthResponse> {
  const previous = await loadSession();
  // Si la sesión anterior venció, el vínculo del celular protegido quedó guardado aparte.
  const local = previous
    ? {
        profileId: previous.profile.id,
        mode: previous.mode,
        linkedDeviceId: previous.linkedDeviceId,
        linkedDeviceName: previous.linkedDeviceName,
      }
    : await loadDeviceBinding();
  const sameAccount = local?.profileId === result.responsible.id;
  await saveSession({
    token: result.token,
    profile: result.responsible,
    mode: sameAccount ? local?.mode : undefined,
    linkedDeviceId: sameAccount ? local?.linkedDeviceId : undefined,
    linkedDeviceName: sameAccount ? local?.linkedDeviceName : undefined,
  });
  return result;
}

export async function registerResponsible(payload: {
  name: string;
  email: string;
  password: string;
  telefono?: string;
  esResponsable?: boolean;
}): Promise<AuthResponse> {
  const data = await apiRequest<unknown>("/api/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
  return startSession(assertAuthResponse(data));
}

export async function loginResponsible(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<unknown>("/api/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
  return startSession(assertAuthResponse(data));
}

export async function logout(): Promise<void> {
  await clearSession();
}

/** Perfil vigente del usuario autenticado. Actualiza la copia de la sesión. */
export async function getMyProfile(): Promise<ResponsibleProfile> {
  const profile = await apiRequest<ResponsibleProfile>("/api/auth/me");
  await updateSession({ profile });
  return profile;
}

/** Guarda el modo de uso en este dispositivo y lo refleja en el servidor. */
export async function updateMyMode(mode: UserMode): Promise<ResponsibleProfile> {
  const profile = await apiRequest<ResponsibleProfile>("/api/auth/me/mode", {
    method: "PATCH",
    body: { mode },
  });
  await updateSession({ profile, mode });
  return profile;
}

/** Actualiza los datos de "Mi cuenta". */
export async function updateMyProfile(payload: {
  name?: string;
  telefono?: string;
}): Promise<ResponsibleProfile> {
  const profile = await apiRequest<ResponsibleProfile>("/api/auth/me", {
    method: "PATCH",
    body: payload,
  });
  await updateSession({ profile });
  return profile;
}

/** Crea o reemplaza el PIN de seguridad de 4 dígitos del adulto. */
export async function setSecurityPin(pin: string): Promise<void> {
  await apiRequest("/api/auth/pin", { method: "PATCH", body: { pin } });
  const session = await loadSession();
  if (session) {
    await updateSession({ profile: { ...session.profile, hasPin: true } });
  }
}

/** Verifica el PIN del adulto. Devuelve false si es incorrecto. */
export async function verifySecurityPin(pin: string): Promise<boolean> {
  try {
    await apiRequest("/api/auth/pin/verify", { method: "POST", body: { pin } });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return false;
    }
    throw error;
  }
}

/** Elimina la cuenta en el servidor y cierra la sesión local. */
export async function deleteMyAccount(password: string): Promise<void> {
  await apiRequest("/api/auth/me", { method: "DELETE", body: { password } });
  await clearSession();
}
