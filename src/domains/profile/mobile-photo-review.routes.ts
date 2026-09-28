import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { linkedAdminMiddleware } from '../../shared/middleware/linked-admin.middleware.js';
import {
    listPendingPhotosForMobile,
    approvePhotoFromMobile,
    rejectPhotoFromMobile,
} from './mobile-photo-review.controller.js';

const router = Router();
router.use(authMiddleware, linkedAdminMiddleware);

router.get('/',              listPendingPhotosForMobile);
router.post('/:id/approve',  approvePhotoFromMobile);
router.post('/:id/reject',   rejectPhotoFromMobile);

export default router;
