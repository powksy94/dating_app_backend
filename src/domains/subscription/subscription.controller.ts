import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { User } from '../../shared/models/user.model.js';
import { fetchActiveEntitlement, periodFromProductId, revenueCatConfigured } from '../../infrastructure/config/revenuecat.js';

const VALID_PLANS = ['nocturne', 'abyssal'] as const;

export const getMySubscription = async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
        plan:   user.subscriptionPlan,
        period: user.subscriptionPeriod,
    });
};

// The client only names which plan it just bought; the period and the fact
// that a purchase really happened are both read from RevenueCat, never
// trusted from the request body (a client could otherwise grant itself any
// paid plan for free with a direct call to this endpoint).
export const subscribe = async (req: AuthRequest, res: Response) => {
    const { plan } = req.body;
    if (!VALID_PLANS.includes(plan)) {
        res.status(400).json({ message: 'Invalid plan' });
        return;
    }
    if (!revenueCatConfigured) {
        res.status(503).json({ message: 'Subscription sync is currently unavailable' });
        return;
    }

    const { active, productId } = await fetchActiveEntitlement(req.userId!, plan);
    if (!active) {
        res.status(403).json({ message: 'No active purchase found for this plan' });
        return;
    }

    const period = periodFromProductId(productId);
    await User.findByIdAndUpdate(req.userId, {
        subscriptionPlan:   plan,
        subscriptionPeriod: period,
    });
    res.json({ plan, period });
};

export const cancelSubscription = async (req: AuthRequest, res: Response) => {
    await User.findByIdAndUpdate(req.userId, {
        subscriptionPlan:   'ombre',
        subscriptionPeriod: 'month',
    });
    res.json({ plan: 'ombre', period: 'month' });
};
