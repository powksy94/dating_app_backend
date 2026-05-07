import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getMyProfile, UptapeMyProfile, getProfileByUserId, uploadPhotos, uploadMiddleware, saveFcmToken } from '../controllers/profile.controller.js';

const router = Router();

router.use(authMiddleware); // All protected roads

router.get('/me',           getMyProfile);
router.put('/me',           UptapeMyProfile);
router.post('/photos',      uploadMiddleware, uploadPhotos);
router.post('/fcm-token',   saveFcmToken);
router.get('/:userId',      getProfileByUserId);

export default router;