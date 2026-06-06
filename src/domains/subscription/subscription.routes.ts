import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { getMySubscription, subscribe, cancelSubscription } from './subscription.controller.js';

const router = Router();
router.use(authMiddleware);
router.get('/',         getMySubscription);
router.post('/subscribe', subscribe);
router.post('/cancel',    cancelSubscription);

export default router;
