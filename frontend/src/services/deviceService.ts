//Creamos esta carpeta y archivo para dejar aislada la llamada a la API. Hoy devuelve datos de prueba. Cuando backend en Node.js tenga listo el endpoint POST /api/devices/link, cambiamos este archivo.
// src/services/deviceService.ts

export type DeviceStatus = 'active' | 'pending' | 'disabled';

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  birthDate?: string;
}

export type DeviceActivityVariant =
  | 'blocked'
  | 'alert'
  | 'settings'
  | 'protected';

export interface DeviceActivity {
  id: string;
  variant: DeviceActivityVariant;
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

const deviceActivities: Record<string, DeviceActivity[]> = {
  '1': [
    {
      id: 'paula-1',
      variant: 'blocked',
      title: 'Sitio web bloqueado',
      description: 'Se bloqueó el acceso a un sitio restringido.',
      time: '10:42',
      date: 'Hoy',
    },
    {
      id: 'paula-2',
      variant: 'alert',
      title: 'Intento de acceso bloqueado',
      description: 'Se detectó un intento de acceso a contenido restringido.',
      time: '10:15',
      date: 'Hoy',
    },
    {
      id: 'paula-3',
      variant: 'protected',
      title: 'Protección activada',
      description: 'La protección está activa en este dispositivo.',
      time: '18:20',
      date: 'Ayer',
    },
  ],
  '2': [
    {
      id: 'ramiro-1',
      variant: 'blocked',
      title: 'Sitio web bloqueado',
      description: 'Se bloqueó el acceso a un sitio restringido.',
      time: '14:25',
      date: 'Hoy',
    },
    {
      id: 'ramiro-2',
      variant: 'settings',
      title: 'Configuración actualizada',
      description: 'Se actualizaron los ajustes de protección.',
      time: '12:30',
      date: 'Ayer',
    },
  ],
  '3': [
    {
      id: 'lorena-1',
      variant: 'protected',
      title: 'Perfil creado',
      description: 'El perfil está pendiente de vinculación con un dispositivo.',
      time: '09:30',
      date: 'Hoy',
    },
  ],
};

export function getDevices(): Device[] {
  return devicesInMemory.map((device) => ({ ...device }));
}

export function getDeviceActivities(deviceId: string): DeviceActivity[] {
  return (deviceActivities[deviceId] ?? []).map((activity) => ({ ...activity }));
}

export function getDeviceById(deviceId: string): Device | undefined {
  const device = devicesInMemory.find((item) => item.id === deviceId);
  return device ? { ...device } : undefined;
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

export const requestLinkingPin = async (deviceName: string, deviceType: string): Promise<LinkInitResponse> => {
  // Simulamos la respuesta del backend Node.js
  console.log('Enviando datos al backend:', { deviceName, deviceType });


// Luego se reemplazaria para hacer una llamada real al backend usando fetch o axios, por ejemplo:
// const response = await fetch('/api/devices/link', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ deviceName, deviceType }),
// });
// const data = await response.json();
// return data;

  // Retornamos un PIN de 4 dígitos de prueba
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        pin: '4829',
        tempDeviceId: 'dev_temp_001',
      });
    }, 1000);
  });
};