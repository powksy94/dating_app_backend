import { Router } from 'express';
import { listEvents, attendEvent, unattendEvent } from './event.controller.js';
import { createEvent, uploadCoverMiddleware } from './create-event.controller.js';
import { listPendingEvents, approveEvent, rejectEvent } from './admin-event.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { adminMiddleware } from '../../shared/middleware/admin.middleware.js';

const router = Router();

router.post('/',             authMiddleware,  uploadCoverMiddleware, createEvent);
router.get('/',              authMiddleware,  listEvents);
router.post('/:id/attend',   authMiddleware,  attendEvent);
router.delete('/:id/attend', authMiddleware,  unattendEvent);

router.get('/pending',       adminMiddleware, listPendingEvents);
router.put('/:id/approve',   adminMiddleware, approveEvent);
router.put('/:id/reject',    adminMiddleware, rejectEvent);

export default router;
