import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getMyProfile, UptapeMyProfile, getProfileByUserId } from '../controllers/profile.controller.js';

const router = Router();

router.use(authMiddleware); // All protected roads

router.get('/me',           getMyProfile);
router.put('/me',           UptapeMyProfile);
router.get('/:userId',      getProfileByUserId);

export default router;