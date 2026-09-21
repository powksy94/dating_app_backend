import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { getMyMatches } from './match.controller.js';
import { getMatchSuggestions } from './suggestions/suggestions.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getMyMatches);
router.get('/:matchId/suggestions', getMatchSuggestions);

export default router;