import { Router } from 'express';
import { register, login, me, checkUsername, changePassword, deleteAccount, refresh, logout } from './auth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { authLimiter } from '../../shared/middleware/rate-limit.middleware.js';


const router = Router();

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.get('/me',        authMiddleware, me);
router.get('/check-username',      checkUsername);
router.post('/change-password',    authMiddleware, authLimiter, changePassword);
router.delete('/account',          authMiddleware, deleteAccount);
router.post('/refresh',                           refresh);
router.post('/logout',             authMiddleware, logout);

export default router;