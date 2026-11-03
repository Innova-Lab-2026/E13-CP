//Creamos esta carpeta y archivo para dejar aislada la llamada a la API. Hoy devuelve datos de prueba. Cuando backend en Node.js tenga listo el endpoint POST /api/devices/link, cambiamos este archivo.
// src/services/deviceService.ts

export interface LinkInitResponse {
  pin: string;
  tempDeviceId: string;
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