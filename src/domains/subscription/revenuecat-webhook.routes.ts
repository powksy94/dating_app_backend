import { Router } from 'express';
import { revenueCatWebhook } from './revenuecat-webhook.controller.js';

const router = Router();

router.post('/', revenueCatWebhook);

export default router;
