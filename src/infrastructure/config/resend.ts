import { Resend } from 'resend';
import { logger } from './logger.js';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
    logger.warn('RESEND_API_KEY manquant — l\'envoi d\'emails (réinitialisation de mot de passe) est désactivé.');
}

export const resendConfigured = Boolean(apiKey);

export const resend = apiKey ? new Resend(apiKey) : null;
