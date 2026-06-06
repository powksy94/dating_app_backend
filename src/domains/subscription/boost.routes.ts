import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { getBoostStatus, useBoost } from './boost.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/',  getBoostStatus);
router.post('/', useBoost);

export default router;
