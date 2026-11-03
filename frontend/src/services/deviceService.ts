// src/services/deviceService.ts
import { Platform } from 'react-native';

// Lee la URL de tu .env del frontend o usa un fallback seguro según la plataforma
const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
).replace(/\/+$/, '');

export type DeviceStatus = 'active' | 'pending' | 'disabled';

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  birthDate?: string;
}

export interface DeviceActivity {
  id: string;
  variant: 'blocked' | 'alert' | 'settings' | 'protected';
  title: string;
  description: string;
  time: string;
  date: string;
}

export interface LinkInitResponse {
  pin: string;
  tempDeviceId: string;
}

const devicesInMemory: Device[] = [
  { id: '1', name: 'Paula', status: 'active' },
  { id: '2', name: 'Ramiro', status: 'active' },
  { id: '3', name: 'Lorena', status: 'pending' },
];

export function getDevices(): Device[] {
  return devicesInMemory.map((device) => ({ ...device }));
}

export function getDeviceById(deviceId: string): Device | undefined {
  const device = devicesInMemory.find((item) => item.id === deviceId);
  return device ? { ...device } : undefined;
}

export function getDeviceActivities(deviceId: string): DeviceActivity[] {
  return [];
}

export function addDevice(name: string, birthDate?: string): Device {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Ingresá un nombre para el dispositivo.');
  }

  const device: Device = {
    id: `local-${Date.now()}-${devicesInMemory.length}`,
    name: trimmedName,
    status: 'pending',
    birthDate,
  };
  devicesInMemory.push(device);
  return { ...device };
}

/**
 * Llama de forma real al backend de Node.js para generar el PIN de vinculación
 */
export const requestLinkingPin = async (deviceName: string, deviceType: string): Promise<LinkInitResponse> => {
  try {
    // Token de sesión del tutor compatible con la clave secreta por defecto del backend
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY3OGFjYTY0LWNmZmUtNDRhZC1iYWRhLWZiNDgzZDY3YTNlOSIsImVtYWlsIjoiYW5hbGlhQHRlc3QuY29tIiwiaWF0IjoxNzkzMjI5MzYyLCJleHAiOjE3OTM4MzQxNjJ9.QiCYgRQjWh1eB05MR8AlvAniK8QNNxwRjeM-ZzHAMY0";

    const response = await fetch(`${API_BASE_URL}/api/devices/generate-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ deviceName }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al generar el PIN de vinculación.');
    }

    return {
      pin: data.pairingPin,        // El PIN de 4 dígitos devuelto por tu backend
      tempDeviceId: data.deviceId,   // El ID del dispositivo registrado
    };
  } catch (error: any) {
    console.error('Error al conectar con el backend:', error);
    throw error;
  }
};