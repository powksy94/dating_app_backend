import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getReceived, getSent, getElegieStatus } from '../controllers/elegie.controller.js';
import { sendElegie } from '../controllers/send-elegie.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/received', getReceived);
router.get('/sent',     getSent);
router.get('/status',   getElegieStatus);
router.post('/:targetId', sendElegie);

export default router;
