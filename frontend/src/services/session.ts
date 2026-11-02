import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ResponsibleProfile, UserMode } from "./auth";

/**
 * Sesión local del dispositivo.
 * - `token` y `profile`: cuenta del adulto responsable (también se usa en el
 *   celular del menor, que opera con la cuenta del adulto).
 * - `mode`: modo elegido en "Selección de modo". Vive en este dispositivo.
 * - `linkedDeviceId`: perfil protegido vinculado a este celular (solo en modo
 *   dispositivo protegido).
 */
export type Session = {
  token: string;
  profile: ResponsibleProfile;
  mode?: UserMode;
  linkedDeviceId?: string;
  linkedDeviceName?: string;
};

const STORAGE_KEY = "ba-protege:session";

let cachedSession: Session | null | undefined;
const listeners = new Set<(session: Session | null) => void>();

function notify(session: Session | null) {
  listeners.forEach((listener) => listener(session));
}

export async function loadSession(): Promise<Session | null> {
  if (cachedSession !== undefined) {
    return cachedSession;
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cachedSession = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cachedSession = null;
  }

  return cachedSession;
}

export async function saveSession(session: Session): Promise<void> {
  cachedSession = session;
  notify(session);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento disponible la sesión sigue en memoria mientras la app esté abierta.
  }
}

export async function updateSession(
  patch: Partial<Session>,
): Promise<Session | null> {
  const current = await loadSession();
  if (!current) {
    return null;
  }

  const next = { ...current, ...patch };
  await saveSession(next);
  return next;
}

/**
 * Vínculo de este celular con un perfil protegido. Se guarda aparte de la sesión
 * para que sobreviva a un token vencido: cuando la misma cuenta vuelve a iniciar
 * sesión, el celular sigue en modo protegido y vinculado al mismo perfil.
 */
export type DeviceBinding = {
  profileId: string;
  mode: UserMode;
  linkedDeviceId?: string;
  linkedDeviceName?: string;
};

const BINDING_KEY = "ba-protege:device-binding";

export async function loadDeviceBinding(): Promise<DeviceBinding | null> {
  try {
    const raw = await AsyncStorage.getItem(BINDING_KEY);
    return raw ? (JSON.parse(raw) as DeviceBinding) : null;
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión local.
 * Con `keepDeviceBinding` (sesión vencida), un celular en modo protegido conserva
 * su modo y su perfil vinculado para recuperarlos al volver a iniciar sesión.
 * Sin esa opción (cerrar sesión, salir del modo protegido, eliminar la cuenta),
 * el vínculo local también se borra.
 */
export async function clearSession(
  options: { keepDeviceBinding?: boolean } = {},
): Promise<void> {
  const current = await loadSession();
  const binding: DeviceBinding | null =
    options.keepDeviceBinding && current?.mode === "dispositivo_protegido"
      ? {
          profileId: current.profile.id,
          mode: current.mode,
          linkedDeviceId: current.linkedDeviceId,
          linkedDeviceName: current.linkedDeviceName,
        }
      : null;

  cachedSession = null;
  notify(null);
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    if (binding) {
      await AsyncStorage.setItem(BINDING_KEY, JSON.stringify(binding));
    } else if (!options.keepDeviceBinding) {
      await AsyncStorage.removeItem(BINDING_KEY);
    }
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}

export async function getSessionToken(): Promise<string | null> {
  return (await loadSession())?.token ?? null;
}

export function subscribeSession(
  listener: (session: Session | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sesión actual como estado de React. `loading` es true hasta leer el almacenamiento. */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(
    cachedSession ?? null,
  );
  const [loading, setLoading] = useState(cachedSession === undefined);

  useEffect(() => {
    let active = true;
    loadSession().then((loaded) => {
      if (active) {
        setSession(loaded);
        setLoading(false);
      }
    });
    const unsubscribe = subscribeSession((next) => {
      if (active) {
        setSession(next);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}
