import { Router } from 'express';
import { linkDevice, getDevices, updateDeviceStatus, registerPushToken } from '../controllers/device.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/link', linkDevice);
router.post('/push-token', registerPushToken);
router.get('/', getDevices);
router.patch('/:id/status', updateDeviceStatus);

export default router;
