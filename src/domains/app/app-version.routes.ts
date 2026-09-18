import { Router } from 'express';

const router = Router();

// Mounted before the version guard so an outdated app can still learn
// that it has to update.
router.get('/version', (_req, res) => {
    const minBuild = Number(process.env.MIN_APP_BUILD);
    res.json({ minBuild: Number.isInteger(minBuild) && minBuild > 0 ? minBuild : 0 });
});

export default router;
