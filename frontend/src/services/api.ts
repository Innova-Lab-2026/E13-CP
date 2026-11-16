import { Platform } from "react-native";
import { clearSession, getSessionToken } from "./session";
import { clearDeviceSession, getDeviceAccessToken } from "./deviceSession";

/**
 * URL del backend. En producción se define con EXPO_PUBLIC_API_URL al compilar
 * (web en Vercel y APK). En desarrollo, el emulador de Android llega a la
 * computadora por 10.0.2.2 y la web por localhost.
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000")
).replace(/\/+$/, "");

/** Mensajes del backend que todavía llegan en inglés, traducidos para la persona usuaria. */
const ERROR_MESSAGES: Record<string, string> = {
  "Invalid email or password": "El correo o la contraseña son incorrectos.",
  "Email and password are required": "Ingresá tu correo y tu contraseña.",
  "Responsible with this email already exists":
    "Ya existe una cuenta con ese correo.",
  "Responsible not found":
    "Tu sesión ya no es válida. Iniciá sesión de nuevo.",
  "Token expired or invalid": "Tu sesión venció. Iniciá sesión de nuevo.",
  "Access token missing or invalid": "Iniciá sesión para continuar.",
  "Invalid PIN": "El PIN es incorrecto.",
  "Device is already linked": "Este dispositivo ya está vinculado.",
  "Device not found or unauthorized":
    "No encontramos ese dispositivo en tu cuenta.",
  "Device not found": "No encontramos ese dispositivo.",
  "Device name is required": "Ingresá un nombre para el dispositivo.",
  "fechaNacimiento is required": "Ingresá la fecha de nacimiento.",
  "fechaNacimiento must use the YYYY-MM-DD format":
    "La fecha de nacimiento no es válida.",
  "Domain is required": "Ingresá un sitio web.",
  "Domain is already in the blocklist": "Ese sitio ya está en la lista de bloqueo.",
  "Alert not found or unauthorized": "No encontramos esa alerta.",
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /**
   * Credencial que se envía. Por defecto true: el token de la sesión del adulto.
   * "device": la credencial propia del celular protegido vinculado con un código.
   */
  auth?: boolean | "device";
};

/** El backend responde esto cuando la credencial del celular protegido ya no sirve. */
function isDeviceUnlinkedError(data: unknown, message: string): boolean {
  const code =
    data !== null && typeof data === "object" ? (data as { code?: unknown }).code : undefined;
  return code === "DEVICE_UNLINKED" || /ya no est[aá] vinculado/i.test(message);
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth === "device") {
    const deviceToken = await getDeviceAccessToken();
    if (!deviceToken) {
      throw new ApiError("Este celular no está vinculado.", 401);
    }
    headers.Authorization = `Device ${deviceToken}`;
  } else if (auth) {
    const token = await getSessionToken();
    if (!token) {
      throw new ApiError("Iniciá sesión para continuar.", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
      0,
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const rawError =
      data !== null &&
      typeof data === "object" &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `El servidor respondió con el estado ${response.status}.`;

    // Token vencido o cuenta inexistente en el servidor: la sesión local ya no sirve.
    // (401 no se incluye: el backend también lo usa para PIN o contraseña incorrectos.)
    if (
      auth === true &&
      (response.status === 403 ||
        (response.status === 404 && rawError === "Responsible not found"))
    ) {
      // Un celular protegido conserva su modo y su perfil vinculado: al volver a
      // iniciar sesión con la misma cuenta sigue protegido sin revincularse.
      await clearSession({ keepDeviceBinding: true });
    }

    // La persona adulta desvinculó este celular (o regeneró su código): la
    // credencial quedó revocada. Las guardias llevan a "Este celular fue desvinculado".
    // Otros 401 de estas rutas son un PIN incorrecto y no cierran nada.
    if (auth === "device" && response.status === 401 && isDeviceUnlinkedError(data, rawError)) {
      await clearDeviceSession("unlinked");
    }

    throw new ApiError(ERROR_MESSAGES[rawError] ?? rawError, response.status);
  }

  return data as T;
}

/** Mensaje legible para mostrar en pantalla a partir de cualquier error. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
