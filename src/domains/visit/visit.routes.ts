import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { getMyVisitors } from './visit.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getMyVisitors);

export default router;
