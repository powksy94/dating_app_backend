import { Router } from 'express';
import { requestAuth, checkStatus, respondAuth } from '../controllers/admin/admin-auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/request',          requestAuth);
router.get('/status/:sessionId', checkStatus);
router.post('/respond',          authMiddleware, respondAuth);

export default router;
