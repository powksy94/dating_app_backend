import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import { likeUser, dislikeUser, fecthSwipeProfiles, getLikedProfiles, getSwipeStatus } from "./swipe.controller.js";
import { rewindLike } from "./rewind.controller.js";
import { whoLikedMe } from "./who-liked.controller.js";
import { resetLikes } from "./reset-likes.controller.js";

const router = Router();
router.use(authMiddleware);

router.get('/feed',              fecthSwipeProfiles);
router.get('/liked',             getLikedProfiles);
router.get('/status',            getSwipeStatus);
router.get('/who-liked-me',      whoLikedMe);
router.post('/like/:targetId',   likeUser);
router.post('/dislike/:targetId', dislikeUser);
router.delete('/rewind',         rewindLike);
router.delete('/likes',          resetLikes);

export default router;
