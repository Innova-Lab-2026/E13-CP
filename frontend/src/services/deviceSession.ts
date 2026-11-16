import { useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Sesión del celular protegido vinculado con un código.
 * No es una cuenta: el celular guarda solo su credencial propia
 * (`deviceAccessToken`), que la persona adulta puede revocar desde su celular.
 * Nunca guarda el correo, la contraseña ni el PIN de la persona adulta.
 */
export type DeviceSession = {
  kind: "device";
  deviceId: string;
  deviceName: string;
  deviceAccessToken: string;
  linkedAt: string;
};

/** Cómo terminó la última sesión del celular, para saber a qué pantalla volver. */
export type DeviceSessionEnd = "unlinked" | "exit";

// SecureStore solo acepta letras, números, ".", "-" y "_" en la clave.
const STORAGE_KEY = "ba-protege.device-session";

/** En Android la credencial va al almacenamiento cifrado; en la web no hay otro lugar. */
const storage =
  Platform.OS === "web"
    ? {
        get: (key: string) => AsyncStorage.getItem(key),
        set: (key: string, value: string) => AsyncStorage.setItem(key, value),
        remove: (key: string) => AsyncStorage.removeItem(key),
      }
    : {
        get: (key: string) => SecureStore.getItemAsync(key),
        set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        remove: (key: string) => SecureStore.deleteItemAsync(key),
      };

let cachedDeviceSession: DeviceSession | null | undefined;
let lastEnd: DeviceSessionEnd | null = null;
const listeners = new Set<(session: DeviceSession | null) => void>();

function notify(session: DeviceSession | null) {
  listeners.forEach((listener) => listener(session));
}

function isDeviceSession(value: unknown): value is DeviceSession {
  const session = value as Partial<DeviceSession> | null;
  return (
    !!session &&
    session.kind === "device" &&
    typeof session.deviceId === "string" &&
    typeof session.deviceAccessToken === "string"
  );
}

export async function loadDeviceSession(): Promise<DeviceSession | null> {
  if (cachedDeviceSession !== undefined) {
    return cachedDeviceSession;
  }

  try {
    const raw = await storage.get(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cachedDeviceSession = isDeviceSession(parsed) ? parsed : null;
  } catch {
    cachedDeviceSession = null;
  }

  return cachedDeviceSession;
}

export async function saveDeviceSession(session: DeviceSession): Promise<void> {
  cachedDeviceSession = session;
  lastEnd = null;
  notify(session);
  try {
    await storage.set(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento disponible la sesión sigue en memoria mientras la app esté abierta.
  }
}

/**
 * Borra la credencial de este celular.
 * `reason` indica a dónde volver: "unlinked" si la persona adulta lo desvinculó
 * (pantalla "Este celular fue desvinculado") y "exit" si se salió con el PIN
 * desde este mismo celular (bienvenida).
 */
export async function clearDeviceSession(reason: DeviceSessionEnd = "exit"): Promise<void> {
  lastEnd = reason;
  cachedDeviceSession = null;
  notify(null);
  try {
    await storage.remove(STORAGE_KEY);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}

/**
 * Pantalla a la que vuelven las guardias cuando este celular se quedó sin sesión
 * de dispositivo, o null si no corresponde (por ejemplo, en el celular del adulto).
 */
export function deviceSessionEndRoute(): "/desvinculado" | "/" | null {
  if (lastEnd === "unlinked") return "/desvinculado";
  if (lastEnd === "exit") return "/";
  return null;
}

/** La pantalla de destino ya se mostró: las guardias vuelven a su comportamiento normal. */
export function acknowledgeDeviceSessionEnd(): void {
  lastEnd = null;
}

export async function getDeviceAccessToken(): Promise<string | null> {
  return (await loadDeviceSession())?.deviceAccessToken ?? null;
}

export function subscribeDeviceSession(
  listener: (session: DeviceSession | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sesión del celular protegido como estado de React. `loading` es true hasta leer el almacenamiento. */
export function useDeviceSession(): {
  deviceSession: DeviceSession | null;
  loading: boolean;
} {
  const [deviceSession, setDeviceSession] = useState<DeviceSession | null>(
    cachedDeviceSession ?? null,
  );
  const [loading, setLoading] = useState(cachedDeviceSession === undefined);

  useEffect(() => {
    let active = true;
    loadDeviceSession().then((loaded) => {
      if (active) {
        setDeviceSession(loaded);
        setLoading(false);
      }
    });
    const unsubscribe = subscribeDeviceSession((next) => {
      if (active) {
        setDeviceSession(next);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { deviceSession, loading };
}
