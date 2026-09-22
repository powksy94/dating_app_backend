import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import { getMyProfile, UptapeMyProfile, getProfileByUserId, uploadPhotos, uploadMiddleware, saveFcmToken } from './profile.controller.js';
import { searchBands } from './band-search.controller.js';

const router = Router();

// Unauthenticated: only reads Spotify's public catalog, no profile data in or
// out, so it must work during registration too, before an account (and a
// token) exists yet (see StepTags in the registration flow).
router.get('/bands/search', searchBands);

router.use(authMiddleware); // All protected roads below

router.get('/me',           getMyProfile);
router.put('/me',           UptapeMyProfile);
router.post('/photos',      uploadMiddleware, uploadPhotos);
router.post('/fcm-token',   saveFcmToken);
router.get('/:userId',      getProfileByUserId);

export default router;