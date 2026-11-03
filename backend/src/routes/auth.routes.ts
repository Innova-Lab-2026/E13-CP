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
import {
  getGoogleLoginConfig,
  googleCallback,
  loginWithGoogle,
  startGoogleLogin
} from '../controllers/google.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerResponsible);
router.post('/login', loginResponsible);

// "Continuar con Google": OAuth 2.0 con código de autorización y PKCE.
router.get('/google/config', getGoogleLoginConfig);
router.get('/google/start', startGoogleLogin);
router.get('/google/callback', googleCallback);
router.post('/google', loginWithGoogle);

// Perfil y modo de uso del usuario autenticado (selección de rol/modo).
router.get('/me', authenticateToken, getMyProfile);
router.patch('/me', authenticateToken, updateMyProfile);
router.delete('/me', authenticateToken, deleteMyAccount);
router.patch('/me/mode', authenticateToken, updateMyMode);

// PIN de seguridad del adulto: autoriza la vinculación y los cambios críticos.
router.patch('/pin', authenticateToken, updateMyPin);
router.post('/pin/verify', authenticateToken, verifyMyPin);

export default router;
