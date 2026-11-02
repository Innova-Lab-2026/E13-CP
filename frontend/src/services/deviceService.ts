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
  /** Código de vinculación de 8 caracteres, para el celular del menor. */
  linkCode?: string;
  lastSeen?: string;
  createdAt?: string;
}

type ApiDevice = {
  id: string;
  deviceName: string;
  fechaNacimiento?: string;
  status: "pending" | "active" | "inactive";
  linkCode?: string;
  lastSeen?: string;
  createdAt?: string;
};

function toDevice(device: ApiDevice): Device {
  return {
    id: device.id,
    name: device.deviceName,
    status: device.status === "inactive" ? "disabled" : device.status,
    birthDate: device.fechaNacimiento,
    linkCode: device.linkCode,
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

/**
 * Crea el perfil del dispositivo protegido. Queda pendiente hasta que el celular
 * del menor confirme el vínculo con el PIN del adulto.
 */
export async function addDevice(
  name: string,
  birthDate: string,
): Promise<{ device: Device; linkCode: string }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Ingresá un nombre para el dispositivo.");
  }

  const data = await apiRequest<{ device: ApiDevice; linkCode: string }>(
    "/api/devices/link",
    { method: "POST", body: { deviceName: trimmedName, fechaNacimiento: birthDate } },
  );
  return { device: toDevice(data.device), linkCode: data.linkCode };
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
