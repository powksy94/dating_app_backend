import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getMySubscription } from '../controllers/subscription.controller.js';

const router = Router();
router.use(authMiddleware);
router.get('/', getMySubscription);

export default router;
