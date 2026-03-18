import { Router } from "express";
import { adminLogin, getStats } from "../controllers/admin.controller.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";

const router = Router();

router.post('/login', adminLogin);
router.get('/stats', adminMiddleware, getStats);

export default router;