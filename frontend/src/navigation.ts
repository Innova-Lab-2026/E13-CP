import type { Href } from "expo-router";
import type { Session } from "./services/session";

/**
 * Pantalla de inicio que corresponde a la sesión de este dispositivo:
 * sin sesión → login; sin modo → selección de modo; adulto sin PIN → crear PIN;
 * dispositivo protegido sin vincular → vinculación.
 */
export function homeRouteFor(session: Session | null): Href {
  if (!session) return "/login";
  if (!session.mode) return "/mode";

  if (session.mode === "dispositivo_protegido") {
    return session.linkedDeviceId ? "/protected" : "/protected/link";
  }

  if (!session.profile.hasPin) return "/pin-setup";
  return "/(main)/(tabs)/(dashboard)";
}
