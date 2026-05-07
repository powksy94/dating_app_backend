import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getMessages, sendMessage, deleteForMe, deleteForAll, uploadChatImage, uploadChatImageMiddleware, uploadChatAudio, uploadChatAudioMiddleware } from "../controllers/chat.controller.js";

const router = Router();

router.use(authMiddleware)

router.get('/:matchId',                    getMessages);
router.post('/:matchId',                   sendMessage);
router.post('/upload/image',               uploadChatImageMiddleware, uploadChatImage);
router.post('/upload/audio',               uploadChatAudioMiddleware, uploadChatAudio);
router.delete('/messages/:messageId/me',   deleteForMe);
router.delete('/messages/:messageId/all',  deleteForAll);

export default router;