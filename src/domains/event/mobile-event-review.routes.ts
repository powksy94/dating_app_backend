import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { linkedAdminMiddleware } from '../../shared/middleware/linked-admin.middleware.js';
import {
    listPendingEventsForMobile,
    approveEventFromMobile,
    rejectEventFromMobile,
} from './mobile-event-review.controller.js';

const router = Router();
router.use(authMiddleware, linkedAdminMiddleware);

router.get('/',              listPendingEventsForMobile);
router.post('/:id/approve',  approveEventFromMobile);
router.post('/:id/reject',   rejectEventFromMobile);

export default router;
