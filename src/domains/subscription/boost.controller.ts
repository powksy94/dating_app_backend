import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { User } from '../../shared/models/user.model.js';
import { Profile } from '../profile/profile.model.js';
import { BOOST_LIMITS, mondayThisWeek } from '../subscription/limits.js';

function shouldReset(plan: 'ombre' | 'nocturne' | 'abyssal', lastReset: Date | null): boolean {
    if (!lastReset) return true;
    const { period } = BOOST_LIMITS[plan];
    if (!period) return false;
    if (period === 'week')  return lastReset < mondayThisWeek();
    // month: reset if lastReset is before the 1st of the current month
    const now     = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return lastReset < firstOfMonth;
}

export async function getBoostStatus(req: AuthRequest, res: Response): Promise<void> {
    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ message: 'User not found' }); return; }

    const config = BOOST_LIMITS[user.subscriptionPlan];
    if (config.credits === 0) {
        res.json({ available: 0, period: null, requiredPlan: 'nocturne' });
        return;
    }

    let credits = user.boostCredits.count;
    if (shouldReset(user.subscriptionPlan, user.boostCredits.lastReset)) {
        credits = config.credits;
    }

    res.json({ available: credits, period: config.period });
}

export async function useBoost(req: AuthRequest, res: Response): Promise<void> {
    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ message: 'User not found' }); return; }

    const config = BOOST_LIMITS[user.subscriptionPlan];
    if (config.credits === 0) {
        res.status(403).json({
            code:         'PLAN_REQUIRED',
            message:      'Boost requires a Nocturne or Abyssal subscription',
            requiredPlan: 'nocturne',
        });
        return;
    }

    if (shouldReset(user.subscriptionPlan, user.boostCredits.lastReset)) {
        user.boostCredits.count     = config.credits;
        user.boostCredits.lastReset = new Date();
    }

    if (user.boostCredits.count <= 0) {
        res.status(403).json({
            code:      'BOOST_LIMIT_REACHED',
            message:   `No boost left for this ${config.period === 'week' ? 'week' : 'month'}`,
            available: 0,
        });
        return;
    }

    user.boostCredits.count -= 1;
    await user.save();

    // Mark the profile as boosted for 30 minutes
    const boostedUntil = new Date(Date.now() + 30 * 60 * 1000);
    await Profile.findOneAndUpdate({ owner: user._id }, { boostedUntil });

    res.json({ ok: true, remaining: user.boostCredits.count, boostedUntil });
}
