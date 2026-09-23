import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import {
    startDiscordAuth, completeDiscordAuth, getDiscordStatus, disconnectDiscord,
} from './discord-oauth.controller.js';

const router = Router();

router.use(authMiddleware); // Linking a Discord account always requires an existing Nocturne session.

router.get('/',          getDiscordStatus);
router.get('/start',     startDiscordAuth);
router.post('/callback', completeDiscordAuth);
router.delete('/',       disconnectDiscord);

export default router;
