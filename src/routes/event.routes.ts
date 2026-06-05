import { Router } from 'express';
import { listEvents, attendEvent, unattendEvent } from '../controllers/event.controller.js';
import { createEvent, uploadCoverMiddleware } from '../controllers/create-event.controller.js';
import { listPendingEvents, approveEvent, rejectEvent } from '../controllers/admin-event.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

router.post('/',             authMiddleware,  uploadCoverMiddleware, createEvent);
router.get('/',              authMiddleware,  listEvents);
router.post('/:id/attend',   authMiddleware,  attendEvent);
router.delete('/:id/attend', authMiddleware,  unattendEvent);

router.get('/pending',       adminMiddleware, listPendingEvents);
router.put('/:id/approve',   adminMiddleware, approveEvent);
router.put('/:id/reject',    adminMiddleware, rejectEvent);

export default router;
