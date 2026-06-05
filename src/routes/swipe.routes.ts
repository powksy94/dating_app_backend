import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { likeUser, dislikeUser, fecthSwipeProfiles, getLikedProfiles, getSwipeStatus } from "../controllers/swipe.controller.js";
import { rewindLike } from "../controllers/rewind.controller.js";
import { whoLikedMe } from "../controllers/who-liked.controller.js";

const router = Router();
router.use(authMiddleware);

router.get('/feed',              fecthSwipeProfiles);
router.get('/liked',             getLikedProfiles);
router.get('/status',            getSwipeStatus);
router.get('/who-liked-me',      whoLikedMe);
router.post('/like/:targetId',   likeUser);
router.post('/dislike/:targetId', dislikeUser);
router.delete('/rewind',         rewindLike);

export default router;
