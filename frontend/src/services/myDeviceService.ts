import { apiRequest } from "./api";
import { toDevice, type ApiDevice, type Device } from "./deviceService";
import type { BlocklistItem, BlocklistStatus, SecurityEventType } from "./blocklistService";

/**
 * Rutas del celular protegido vinculado con un código (/api/devices/me/*).
 * Usan la credencial propia del celular, nunca la cuenta de la persona adulta.
 */

/** Formato del código de vinculación: 8 letras y números, sin 0, O, 1 ni I. */
export const LINK_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;

/** "abcd-efgh " -> "ABCDEFGH": mayúsculas, sin espacios ni guiones. */
export function normalizeLinkCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

export type ClaimResult = {
  device: { id: string; deviceName: string; status: ApiDevice["status"] };
  deviceAccessToken: string;
};

/**
 * Vincula este celular con el código que generó la persona adulta y su PIN.
 * Devuelve la credencial propia del celular. No necesita sesión.
 */
export async function claimDevice(linkCode: string, pin: string): Promise<ClaimResult> {
  const data = await apiRequest<Partial<ClaimResult> | null>("/api/devices/claim", {
    method: "POST",
    body: { linkCode, pin },
    auth: false,
  });
  if (
    !data ||
    typeof data.deviceAccessToken !== "string" ||
    !data.device ||
    typeof data.device.id !== "string"
  ) {
    throw new Error("El servidor devolvió una respuesta de vinculación no válida.");
  }
  return data as ClaimResult;
}

/** Estado del perfil de este celular. También le avisa al servidor que sigue conectado. */
export async function getMyDevice(): Promise<Device> {
  const data = await apiRequest<{ device: ApiDevice }>("/api/devices/me", { auth: "device" });
  return toDevice(data.device);
}

/** Lista de bloqueo de este celular: listado oficial y sitios agregados por la persona adulta. */
export async function getMyBlocklist(): Promise<{
  blocklist: BlocklistItem[];
  status: BlocklistStatus;
}> {
  return apiRequest("/api/devices/me/blocklist", { auth: "device" });
}

/** Registra un evento de este celular para la persona adulta. */
export async function recordMyEvent(event: {
  eventType: SecurityEventType;
  domain?: string;
  details: string;
}): Promise<void> {
  await apiRequest("/api/devices/me/events", { method: "POST", body: event, auth: "device" });
}

/** Activa o pausa la protección. El servidor exige el PIN de la persona adulta. */
export async function setMyProtection(active: boolean, pin: string): Promise<Device> {
  const data = await apiRequest<{ device: ApiDevice }>("/api/devices/me/status", {
    method: "PATCH",
    body: { status: active ? "active" : "inactive", pin },
    auth: "device",
  });
  return toDevice(data.device);
}

/**
 * Desvincula este celular con el PIN de la persona adulta. El servidor revoca la
 * credencial y deja el perfil pendiente con un código nuevo.
 */
export async function unlinkMe(pin: string): Promise<void> {
  await apiRequest("/api/devices/me/unlink", {
    method: "POST",
    body: { pin },
    auth: "device",
  });
}
