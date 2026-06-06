import { Router } from 'express';
import { requestAuth, checkStatus, respondAuth } from './admin-auth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post('/request',          requestAuth);
router.get('/status/:sessionId', checkStatus);
router.post('/respond',          authMiddleware, respondAuth);

export default router;
