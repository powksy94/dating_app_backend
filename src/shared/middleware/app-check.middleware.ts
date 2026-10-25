import { Request, Response, NextFunction } from 'express';
import admin from '../../infrastructure/config/firebase-admin.js';
import { logger } from '../../infrastructure/config/logger.js';

// Escape hatch for local/dev/CI where no App Check debug token is configured.
// Must never be unset (or 'false') in production.
const ENFORCE = process.env.APP_CHECK_ENFORCEMENT !== 'false';

/** Rejects requests that don't carry a valid Firebase App Check token (Play
 * Integrity on Android), closing the mass-fake-account vector: a script
 * hitting the API directly can't produce a token for a genuine, unmodified
 * app install the way a real user's device can. */
export async function appCheckMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!ENFORCE) {
        next();
        return;
    }

    const token = req.headers['x-firebase-appcheck'];
    if (typeof token !== 'string' || !token) {
        res.status(401).json({ message: 'Missing app integrity token', code: 'APP_CHECK_MISSING' });
        return;
    }

    try {
        await admin.appCheck().verifyToken(token);
        next();
    } catch (err) {
        logger.warn('App Check: jeton invalide ou rejeté', { err });
        res.status(401).json({ message: 'Invalid app integrity token', code: 'APP_CHECK_INVALID' });
    }
}
