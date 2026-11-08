import { Router } from 'express';
import {
  registerResponsible,
  loginResponsible,
  getMyProfile,
  updateMyMode
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerResponsible);
router.post('/login', loginResponsible);

// Perfil y modo de uso del usuario autenticado (selección de rol/modo).
router.get('/me', authenticateToken, getMyProfile);
router.patch('/me/mode', authenticateToken, updateMyMode);

export default router;
