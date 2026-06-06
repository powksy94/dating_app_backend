import { Router } from 'express';
import { register, login, me, checkUsername, changePassword, deleteAccount } from './auth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';


const router = Router();

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        authMiddleware, me);
router.get('/check-username',      checkUsername);
router.post('/change-password',    authMiddleware, changePassword);
router.delete('/account',          authMiddleware, deleteAccount);

export default router;