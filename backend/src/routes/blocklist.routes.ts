import { Router } from 'express';
import {
  getBlocklist,
  addCustomBlocklistItem,
  removeCustomBlocklistItem,
  checkDomain,
  getStatus,
  syncOfficial
} from '../controllers/blocklist.controller';
import { createSuggestion, listSuggestions } from '../controllers/suggestion.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdminSecret } from '../middleware/admin.middleware';

const router = Router();

// Public route for local VPN / mobile app domain checking
router.post('/check', checkDomain);

// Operational route: updates the official LOTBA list. Not exposed to the
// adult profile, because the official list cannot be modified from it.
router.post('/sync/official', requireAdminSecret, syncOfficial);

// Protected routes for responsible management
router.get('/', authenticateToken, getBlocklist);
router.get('/status', authenticateToken, getStatus);
router.post('/custom', authenticateToken, addCustomBlocklistItem);
router.delete('/custom/:id', authenticateToken, removeCustomBlocklistItem);

// "Sugerir un sitio": el adulto propone un dominio y el equipo lo revisa con
// LOTBA. El listado de sugerencias es operativo, con el mismo secreto que la sincronización.
router.post('/suggestions', authenticateToken, createSuggestion);
router.get('/suggestions', requireAdminSecret, listSuggestions);

export default router;
