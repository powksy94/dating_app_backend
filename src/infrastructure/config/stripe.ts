import Stripe from 'stripe';
import { logger } from './logger.js';

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
    logger.warn('STRIPE_SECRET_KEY manquant — les paiements d\'évènements sont désactivés.');
}

/// `null` as long as STRIPE_SECRET_KEY isn't configured (the rest of the backend
/// keeps working; only the event payment endpoints depend on it).
export const stripe = apiKey ? new Stripe(apiKey) : null;
