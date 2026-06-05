import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getMyVisitors } from '../controllers/visit.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getMyVisitors);

export default router;
