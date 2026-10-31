// routes/device.routes.ts
import { Router } from 'express';
import { 
  generatePairingPin, 
  confirmDeviceLink, 
  getDevices, 
  updateDeviceStatus 
} from '../controllers/device.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// [NUEVO] Ruta pública para que el dispositivo del menor confirme el PIN sin requerir token JWT de adulto
router.post('/confirm-link', confirmDeviceLink);

// Rutas protegidas que requieren autenticación del tutor (requieren token JWT)
router.use(authenticateToken);

// [NUEVO] Ruta protegida para que el tutor genere el PIN para un nuevo dispositivo
router.post('/generate-pin', generatePairingPin);

router.get('/', getDevices);
router.patch('/:id/status', updateDeviceStatus);

export default router;



















//==================================================

// import { Router } from 'express';
// import { linkDevice, getDevices, updateDeviceStatus } from '../controllers/device.controller';
// import { authenticateToken } from '../middleware/auth.middleware';

// const router = Router();

// router.use(authenticateToken);

// router.post('/link', linkDevice);
// router.get('/', getDevices);
// router.patch('/:id/status', updateDeviceStatus);

// export default router;
