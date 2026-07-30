import Stripe from 'stripe';
import { logger } from './logger.js';

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
    logger.warn('STRIPE_SECRET_KEY manquant — les paiements d\'évènements sont désactivés.');
}

/// `null` tant que STRIPE_SECRET_KEY n'est pas configurée (le reste du backend
/// continue de fonctionner ; seuls les endpoints de paiement d'évènement en dépendent).
export const stripe = apiKey ? new Stripe(apiKey) : null;
