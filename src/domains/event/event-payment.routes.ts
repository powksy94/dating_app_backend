import { Router } from 'express';
import { createPaymentIntent, confirmPayment } from './event-payment.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post('/:id/payment-intent', authMiddleware, createPaymentIntent);
router.post('/confirm-payment',    authMiddleware, confirmPayment);

export default router;
