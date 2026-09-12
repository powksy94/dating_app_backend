import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { linkedAdminMiddleware } from '../../shared/middleware/linked-admin.middleware.js';
import { listReports, dismissReport, banUser, unbanUser } from '../admin/moderation.controller.js';

const router = Router();
router.use(authMiddleware, linkedAdminMiddleware);

router.get('/',                     listReports);
router.delete('/:id',               dismissReport);
router.post('/users/:userId/ban',   banUser);
router.post('/users/:userId/unban', unbanUser);

export default router;
