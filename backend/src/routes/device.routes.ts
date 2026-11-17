import { Router } from 'express';
import {
  linkDevice,
  confirmDeviceLink,
  getDevices,
  updateDeviceStatus,
  registerPushToken,
  regenerateLinkCode
} from '../controllers/device.controller';
import {
  claimDevice,
  getMyBlocklist,
  getMyDevice,
  recordMyEvent,
  unlinkMyDevice,
  updateMyDeviceStatus,
  verifyMyDevicePin
} from '../controllers/deviceAccess.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authenticateDevice } from '../middleware/device.middleware';

const router = Router();

// Celular del menor: se vincula con el código + PIN y después usa su propia
// credencial ("Authorization: Device ..."). Van antes del authenticateToken
// del adulto, que rechaza esa credencial.
router.post('/claim', claimDevice);
router.get('/me', authenticateDevice, getMyDevice);
router.get('/me/blocklist', authenticateDevice, getMyBlocklist);
router.post('/me/events', authenticateDevice, recordMyEvent);
router.post('/me/verify-pin', authenticateDevice, verifyMyDevicePin);
router.patch('/me/status', authenticateDevice, updateMyDeviceStatus);
router.post('/me/unlink', authenticateDevice, unlinkMyDevice);

router.use(authenticateToken);

router.post('/link', linkDevice);
router.post('/confirm-link', confirmDeviceLink);
router.post('/push-token', registerPushToken);
router.get('/', getDevices);
router.patch('/:id/status', updateDeviceStatus);
router.post('/:id/link-code', regenerateLinkCode);

export default router;
