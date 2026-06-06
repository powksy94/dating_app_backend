import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import { seedMockUsers, seedDemoLikes, resetAllData } from "./dev.controller.js";

const router = Router();

router.post('/seed-mocks', seedMockUsers);
router.post('/seed-likes', authMiddleware, seedDemoLikes);
router.post('/reset-all', resetAllData);

export default router;
