import { Router } from "express";
import { adminLogin, getStats } from "./admin.controller.js";
import { listReports, dismissReport, banUser, unbanUser } from "./moderation.controller.js";
import { adminMiddleware } from "../../shared/middleware/admin.middleware.js";

const router = Router();

router.post('/login', adminLogin);
router.get('/stats', adminMiddleware, getStats);

router.get('/reports',                adminMiddleware, listReports);
router.delete('/reports/:id',         adminMiddleware, dismissReport);
router.post('/users/:userId/ban',     adminMiddleware, banUser);
router.post('/users/:userId/unban',   adminMiddleware, unbanUser);

export default router;