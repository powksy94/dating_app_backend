import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { blockUser, unblockUser, reportUser } from './user.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/:id/block',    blockUser);
router.delete('/:id/block',  unblockUser);
router.post('/:id/report',   reportUser);

export default router;
