import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { sendElegie, getReceived, getSent } from '../controllers/elegie.controller.js';

const router = Router();
router.use(authMiddleware);

router.post('/:targetId', sendElegie);
router.get('/received',   getReceived);
router.get('/sent',       getSent);

export default router;
