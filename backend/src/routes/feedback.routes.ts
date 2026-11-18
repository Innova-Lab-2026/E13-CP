import { Router } from 'express';
import { createFeedback, listFeedback } from '../controllers/feedback.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdminSecret } from '../middleware/admin.middleware';

const router = Router();

// "Ayudanos a mejorar": el adulto envía su opinión desde la app. El listado es
// operativo, con el mismo secreto que las sugerencias y la sincronización.
router.post('/', authenticateToken, createFeedback);
router.get('/', requireAdminSecret, listFeedback);

export default router;
