import { apiRequest } from "./api";

/**
 * Estado del dispositivo tal como lo muestra la app.
 * El backend usa `inactive`; en la interfaz se representa como `disabled`.
 */
export type DeviceStatus = "active" | "pending" | "disabled";

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  /** Fecha de nacimiento del menor en formato AAAA-MM-DD. */
  birthDate?: string;
  /**
   * Código de vinculación de 8 caracteres para el celular del menor. El backend
   * solo lo manda mientras el perfil está pendiente y el código sigue vigente.
   */
  linkCode?: string;
  /** Vencimiento del código (ISO). */
  linkCodeExpiresAt?: string;
  /** Cuándo se vinculó el celular (ISO). Falta en los perfiles vinculados antes de los códigos. */
  linkedAt?: string;
  lastSeen?: string;
  createdAt?: string;
}

/** Nombre del perfil: entre 2 y 40 caracteres, igual que valida el backend. */
export const DEVICE_NAME_MIN_LENGTH = 2;
export const DEVICE_NAME_MAX_LENGTH = 40;

export type ApiDevice = {
  id: string;
  deviceName: string;
  fechaNacimiento?: string;
  status: "pending" | "active" | "inactive";
  linkCode?: string;
  linkCodeExpiresAt?: string;
  linkedAt?: string;
  lastSeen?: string;
  createdAt?: string;
};

export function toDevice(device: ApiDevice): Device {
  return {
    id: device.id,
    name: device.deviceName,
    status: device.status === "inactive" ? "disabled" : device.status,
    birthDate: device.fechaNacimiento,
    linkCode: device.linkCode,
    linkCodeExpiresAt: device.linkCodeExpiresAt,
    linkedAt: device.linkedAt,
    lastSeen: device.lastSeen,
    createdAt: device.createdAt,
  };
}

export async function getDevices(): Promise<Device[]> {
  const data = await apiRequest<{ devices: ApiDevice[] }>("/api/devices");
  return data.devices.map(toDevice);
}

export async function getDeviceById(deviceId: string): Promise<Device | undefined> {
  const devices = await getDevices();
  return devices.find((device) => device.id === deviceId);
}

export type LinkCode = {
  linkCode: string;
  linkCodeExpiresAt?: string;
};

/**
 * Crea el perfil del dispositivo protegido. Queda pendiente hasta que el celular
 * del menor se vincule con el código y el PIN del adulto.
 */
export async function addDevice(
  name: string,
  birthDate: string,
): Promise<{ device: Device } & LinkCode> {
  const trimmedName = name.trim();
  if (trimmedName.length < DEVICE_NAME_MIN_LENGTH) {
    throw new Error("El nombre tiene que tener al menos 2 caracteres.");
  }

  const data = await apiRequest<{
    device: ApiDevice;
    linkCode: string;
    linkCodeExpiresAt?: string;
  }>("/api/devices/link", {
    method: "POST",
    body: { deviceName: trimmedName, fechaNacimiento: birthDate },
  });
  return {
    device: toDevice(data.device),
    linkCode: data.linkCode,
    linkCodeExpiresAt: data.linkCodeExpiresAt ?? data.device.linkCodeExpiresAt,
  };
}

/**
 * Genera un código de vinculación nuevo para el perfil. Si el celular ya estaba
 * vinculado hace falta el PIN del adulto: el servidor revoca la credencial de ese
 * celular, que deja de estar protegido, y el perfil vuelve a quedar pendiente.
 */
export async function generateLinkCode(
  deviceId: string,
  pin?: string,
): Promise<{ device: Device } & LinkCode> {
  const data = await apiRequest<{
    linkCode: string;
    linkCodeExpiresAt?: string;
    device: ApiDevice;
  }>(`/api/devices/${encodeURIComponent(deviceId)}/link-code`, {
    method: "POST",
    body: pin ? { pin } : {},
  });
  return {
    device: toDevice(data.device),
    linkCode: data.linkCode,
    linkCodeExpiresAt: data.linkCodeExpiresAt,
  };
}

/** Confirma el vínculo desde el celular del menor con el PIN del adulto. */
export async function confirmDeviceLink(
  deviceId: string,
  pin: string,
): Promise<Device> {
  const data = await apiRequest<{ device: ApiDevice }>("/api/devices/confirm-link", {
    method: "POST",
    body: { deviceId, pin },
  });
  return toDevice(data.device);
}

/**
 * Desvincula el perfil del celular protegido: vuelve a quedar pendiente para que
 * otro celular (o el mismo) pueda vincularse de nuevo con el PIN.
 */
export async function unlinkDevice(deviceId: string): Promise<Device> {
  const data = await apiRequest<{ device: ApiDevice }>(
    `/api/devices/${encodeURIComponent(deviceId)}/status`,
    { method: "PATCH", body: { status: "pending" } },
  );
  return toDevice(data.device);
}

/** Activa o pausa la protección de un dispositivo ya vinculado. */
export async function setDeviceProtection(
  deviceId: string,
  active: boolean,
): Promise<Device> {
  const data = await apiRequest<{ device: ApiDevice }>(
    `/api/devices/${encodeURIComponent(deviceId)}/status`,
    { method: "PATCH", body: { status: active ? "active" : "inactive" } },
  );
  return toDevice(data.device);
}
