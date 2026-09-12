import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { blockUser, unblockUser, reportUser, getIsLinkedAdmin } from './user.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/me/is-admin',   getIsLinkedAdmin);
router.post('/:id/block',    blockUser);
router.delete('/:id/block',  unblockUser);
router.post('/:id/report',   reportUser);

export default router;
