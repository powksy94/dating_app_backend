import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { likeUser, dislikeUser, fecthSwipeProfiles } from "../controllers/swipe.controller.js";

const router = Router();

router.use(authMiddleware);

router.get('/feed',             fecthSwipeProfiles);
router.post('/like/:targetId',  likeUser);
router.post('/dislike/:targetId', dislikeUser);

export default router;