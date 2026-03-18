import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getMyMatches } from '../controllers/match.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getMyMatches);

export default router;