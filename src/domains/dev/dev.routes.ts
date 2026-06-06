import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import { seedMockUsers, seedDemoLikes } from "./dev.controller.js";

const router = Router();

router.post('/seed-mocks', seedMockUsers);
router.post('/seed-likes', authMiddleware, seedDemoLikes);

export default router;
