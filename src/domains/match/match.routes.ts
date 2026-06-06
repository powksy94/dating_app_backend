import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { getMyMatches } from './match.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getMyMatches);

export default router;