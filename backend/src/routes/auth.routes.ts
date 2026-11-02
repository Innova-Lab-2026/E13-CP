import { Router } from 'express';
import {
  registerResponsible,
  loginResponsible,
  getMyProfile,
  updateMyMode,
  updateMyPin,
  verifyMyPin,
  updateMyProfile,
  deleteMyAccount
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerResponsible);
router.post('/login', loginResponsible);

// Perfil y modo de uso del usuario autenticado (selección de rol/modo).
router.get('/me', authenticateToken, getMyProfile);
router.patch('/me', authenticateToken, updateMyProfile);
router.delete('/me', authenticateToken, deleteMyAccount);
router.patch('/me/mode', authenticateToken, updateMyMode);

// PIN de seguridad del adulto: autoriza la vinculación y los cambios críticos.
router.patch('/pin', authenticateToken, updateMyPin);
router.post('/pin/verify', authenticateToken, verifyMyPin);

export default router;
