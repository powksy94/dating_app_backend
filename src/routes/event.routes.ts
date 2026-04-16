import { Router } from 'express';
import {
    createEvent,
    listEvents,
    attendEvent,
    unattendEvent,
    listPendingEvents,
    approveEvent,
    rejectEvent,
    uploadCoverMiddleware,
} from '../controllers/event.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js'
import { adminMiddleware } from '../middleware/admin.middleware.js'

const router = Router();

// User
router.post('/',                authMiddleware, uploadCoverMiddleware, createEvent);
router.get('/',                 authMiddleware, listEvents);
router.post('/:id/attend',      authMiddleware, attendEvent);
router.delete('/:id/attend',    authMiddleware, unattendEvent);

// Admin
router.get('/pending',          adminMiddleware, listPendingEvents);
router.put('/:id/approve',       adminMiddleware, approveEvent);
router.put('/:id/reject',       adminMiddleware, rejectEvent);

export default router;