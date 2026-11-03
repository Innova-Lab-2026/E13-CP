// controllers/device.controller.ts
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, Device } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * [NUEVO] Genera un PIN de vinculación de 4 dígitos para que el tutor 
 * pueda asociar el celular del menor. El dispositivo nace en estado 'pending'.
 */
export const generatePairingPin = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { deviceName } = req.body;

    if (!deviceName) {
      return res.status(400).json({ error: 'Device name is required' });
    }

    // Generar un PIN aleatorio de 4 dígitos (ej: "4829")
    const pairingPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newDevice: Device = {
      id: uuidv4(),
      responsibleId: responsibleId!,
      deviceName,
      deviceToken: `fcm-token-${uuidv4()}`, // Token temporal hasta que el menor se conecte
      status: 'pending', // [NUEVO] Inicia pendiente hasta que se ingrese el PIN
      pairingPin,       // [NUEVO] Guardamos el PIN generado
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    db.devices.push(newDevice);

    return res.status(201).json({
      message: 'Pairing PIN generated successfully',
      deviceId: newDevice.id,
      pairingPin, // Se lo devolvemos al tutor para que lo muestre en pantalla
      deviceName: newDevice.deviceName
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * [NUEVO] Endpoint público (o validado) que usa la app del menor para 
 * ingresar el PIN, confirmar la vinculación y activar el dispositivo.
 */
export const confirmDeviceLink = async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'Pairing PIN is required' });
    }

    // Buscamos un dispositivo pendiente que coincida con el PIN
    const device = db.devices.find(d => d.pairingPin === pin && d.status === 'pending');

    if (!device) {
      return res.status(400).json({ error: 'Invalid or expired pairing PIN' });
    }

    // [NUEVO] Cambiamos el estado a activo y limpiamos/actualizamos datos
    device.status = 'active';
    device.lastSeen = new Date().toISOString();

    // Generar alerta automática para el tutor indicando que el dispositivo se vinculó con éxito
    db.alerts.push({
      id: uuidv4(),
      responsibleId: device.responsibleId,
      deviceId: device.id,
      alertType: 'DEVICE_LINKED',
      message: `Dispositivo protegido "${device.deviceName}" vinculado exitosamente.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({
      message: 'Device linked and activated successfully',
      device: {
        id: device.id,
        deviceName: device.deviceName,
        status: device.status
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getDevices = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const devices = db.devices.filter(d => d.responsibleId === responsibleId);
    return res.status(200).json({ devices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateDeviceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const responsibleId = req.responsibleId;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active or inactive' });
    }

    const device = db.devices.find(d => d.id === id && d.responsibleId === responsibleId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found or unauthorized' });
    }

    device.status = status;
    device.lastSeen = new Date().toISOString();

    return res.status(200).json({
      message: 'Device status updated successfully',
      device
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};















//===============================================================================================




// import { Response } from 'express';
// import { v4 as uuidv4 } from 'uuid';
// import { db, Device } from '../config/db';
// import { AuthRequest } from '../middleware/auth.middleware';

// export const linkDevice = async (req: AuthRequest, res: Response) => {
//   try {
//     const responsibleId = req.responsibleId;
//     const { deviceName, deviceToken } = req.body;

//     if (!deviceName || !deviceToken) {
//       return res.status(400).json({ error: 'Device name and device token are required' });
//     }

//     const newDevice: Device = {
//       id: uuidv4(),
//       responsibleId: responsibleId!,
//       deviceName,
//       deviceToken,
//       status: 'active',
//       lastSeen: new Date().toISOString(),
//       createdAt: new Date().toISOString()
//     };

//     db.devices.push(newDevice);

//     // Create an alert / log event for device linking
//     db.alerts.push({
//       id: uuidv4(),
//       responsibleId: responsibleId!,
//       deviceId: newDevice.id,
//       alertType: 'DEVICE_LINKED',
//       message: `Dispositivo protegido "${deviceName}" vinculado exitosamente.`,
//       read: false,
//       createdAt: new Date().toISOString()
//     });

//     return res.status(201).json({
//       message: 'Device linked successfully',
//       device: newDevice
//     });
//   } catch (error: any) {
//     return res.status(500).json({ error: error.message || 'Internal server error' });
//   }
// };

// export const getDevices = async (req: AuthRequest, res: Response) => {
//   try {
//     const responsibleId = req.responsibleId;
//     const devices = db.devices.filter(d => d.responsibleId === responsibleId);
//     return res.status(200).json({ devices });
//   } catch (error: any) {
//     return res.status(500).json({ error: error.message || 'Internal server error' });
//   }
// };

// export const updateDeviceStatus = async (req: AuthRequest, res: Response) => {
//   try {
//     const responsibleId = req.responsibleId;
//     const { id } = req.params;
//     const { status } = req.body;

//     if (!['active', 'inactive'].includes(status)) {
//       return res.status(400).json({ error: 'Invalid status. Must be active or inactive' });
//     }

//     const device = db.devices.find(d => d.id === id && d.responsibleId === responsibleId);
//     if (!device) {
//       return res.status(404).json({ error: 'Device not found or unauthorized' });
//     }

//     device.status = status;
//     device.lastSeen = new Date().toISOString();

//     return res.status(200).json({
//       message: 'Device status updated successfully',
//       device
//     });
//   } catch (error: any) {
//     return res.status(500).json({ error: error.message || 'Internal server error' });
//   }
// };
