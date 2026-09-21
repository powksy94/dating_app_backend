import { Request, Response, NextFunction } from 'express';

// New builds announce themselves as "Nocturne/<version>+<build>" in their
// User-Agent. Builds that predate version reporting still carry Dart's default
// "Dart/..." agent, so they are recognized as too old. Anything else (web admin
// panel, webhooks, curl) is not the mobile app and is never blocked here.
const APP_USER_AGENT = /^Nocturne\/\S+\+(\d+)/;
const LEGACY_APP_USER_AGENT = /^Dart\//;

// Inactive until MIN_APP_BUILD is set. A failure inside the guard itself must
// never take the API down, so any unexpected error lets the request through.
export function appVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
        const minBuild = Number(process.env.MIN_APP_BUILD);
        if (!Number.isInteger(minBuild) || minBuild <= 0) { next(); return; }

        const userAgent = req.headers['user-agent'] ?? '';
        const match = APP_USER_AGENT.exec(userAgent);
        const outdated = match ? Number(match[1]) < minBuild : LEGACY_APP_USER_AGENT.test(userAgent);
        if (!outdated) { next(); return; }

        res.status(426).json({
            code:     'UPDATE_REQUIRED',
            message:  'Update required',
            minBuild,
        });
    } catch {
        next();
    }
}
