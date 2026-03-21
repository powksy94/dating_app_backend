import { Router } from 'express';
import { register, login, me, checkUsername } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = Router();

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        authMiddleware, me);
router.get('/check-username', checkUsername);

export default router;