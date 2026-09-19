import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const tooManyRequests = { message: 'Trop de requêtes, réessaie dans quelques minutes.' };

/**
 * Generous limit on the whole API, per IP. It only stops scripts hammering the
 * server: a normal session stays far below it. Mobile networks put many users
 * behind one IP, hence the high ceiling.
 */
export const apiLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooManyRequests,
    // Webhooks come from RevenueCat's servers, not from users.
    skip: (req) => req.path.startsWith('/revenuecat'),
});

/** Strict limit on credential endpoints (login, registration, password change). */
export const authLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooManyRequests,
});
