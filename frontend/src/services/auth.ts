import { Platform } from "react-native";

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
  createdAt?: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  responsible: ResponsibleProfile;
};

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000")
).replace(/\/+$/, "");

async function sendAuthRequest(
  endpoint: "register" | "login",
  payload: Record<string, unknown>,
): Promise<AuthResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `No se pudo conectar con el backend en ${API_BASE_URL}. Verifica que esté ejecutándose.`,
    );
  }

  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null) {
    throw new Error("El backend devolvió una respuesta no válida.");
  }

  const data = body as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `El backend respondió con el estado ${response.status}.`,
    );
  }

  if (
    typeof data.message !== "string" ||
    typeof data.token !== "string" ||
    typeof data.responsible !== "object" ||
    data.responsible === null
  ) {
    throw new Error("El backend devolvió una respuesta de autenticación no válida.");
  }

  const responsible = data.responsible as Record<string, unknown>;
  if (
    typeof responsible.id !== "string" ||
    typeof responsible.email !== "string" ||
    typeof responsible.name !== "string" ||
    typeof responsible.rol !== "string" ||
    typeof responsible.mode !== "string"
  ) {
    throw new Error("El backend devolvió datos de usuario no válidos.");
  }

  return {
    message: data.message,
    token: data.token,
    responsible: {
      id: responsible.id,
      email: responsible.email,
      name: responsible.name,
      rol: responsible.rol as UserRole,
      mode: responsible.mode as UserMode,
      telefono:
        typeof responsible.telefono === "string" ? responsible.telefono : undefined,
      createdAt:
        typeof responsible.createdAt === "string" ? responsible.createdAt : undefined,
    },
  };
}

export function registerResponsible(payload: {
  name: string;
  email: string;
  password: string;
  telefono?: string;
  esResponsable?: boolean;
}) {
  return sendAuthRequest("register", payload);
}

export function loginResponsible(payload: {
  email: string;
  password: string;
}) {
  return sendAuthRequest("login", payload);
}

/**
 * Perfil vigente del usuario autenticado.
 * Requiere el token en `Authorization: Bearer <token>`.
 */
export async function getMyProfile(token: string): Promise<ResponsibleProfile> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `El backend respondió con el estado ${response.status}.`,
    );
  }

  return data as unknown as ResponsibleProfile;
}

/**
 * Guarda el modo de uso ("adulto" | "dispositivo_protegido") del usuario.
 * El cliente puede persistirlo también en su Storage local.
 */
export async function updateMyMode(
  token: string,
  mode: UserMode,
): Promise<ResponsibleProfile> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me/mode`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `El backend respondió con el estado ${response.status}.`,
    );
  }

  return data as unknown as ResponsibleProfile;
}
