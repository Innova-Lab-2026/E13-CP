import { Router } from 'express';
import { linkDevice, confirmDeviceLink, getDevices, updateDeviceStatus } from '../controllers/device.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/link', linkDevice);
router.post('/confirm-link', confirmDeviceLink);
router.get('/', getDevices);
router.patch('/:id/status', updateDeviceStatus);

export default router;
