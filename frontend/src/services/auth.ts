import { Platform } from "react-native";

export type AuthResponse = {
  message: string;
  token: string;
  responsible: {
    id: string;
    email: string;
    name: string;
  };
};

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000")
).replace(/\/+$/, "");

async function sendAuthRequest(
  endpoint: "register" | "login",
  payload: Record<string, string>,
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
    typeof responsible.name !== "string"
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
    },
  };
}

export function registerResponsible(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return sendAuthRequest("register", payload);
}

export function loginResponsible(payload: {
  email: string;
  password: string;
}) {
  return sendAuthRequest("login", payload);
}
