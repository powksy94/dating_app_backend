import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getBoostStatus, useBoost } from '../controllers/boost.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/',  getBoostStatus);
router.post('/', useBoost);

export default router;
