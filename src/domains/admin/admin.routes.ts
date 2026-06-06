import { Router } from "express";
import { adminLogin, getStats } from "./admin.controller.js";
import { adminMiddleware } from "../../shared/middleware/admin.middleware.js";

const router = Router();

router.post('/login', adminLogin);
router.get('/stats', adminMiddleware, getStats);

export default router;