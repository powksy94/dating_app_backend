import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import { seedMockUsers, seedDemoLikes, seedDemoReport, resetAllData } from "./dev.controller.js";

const router = Router();

router.post('/seed-mocks', seedMockUsers);
router.post('/seed-likes', authMiddleware, seedDemoLikes);
router.post('/seed-report', seedDemoReport);
router.post('/reset-all', resetAllData);

export default router;
