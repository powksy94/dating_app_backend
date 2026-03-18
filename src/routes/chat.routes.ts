import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getMessages, sendMessage } from "../controllers/chat.controller.js";

const router = Router();

router.use(authMiddleware)

router.get('/:matchId', getMessages);
router.post('/matchId', sendMessage);

export default router;