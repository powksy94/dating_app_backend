import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/user.model.js';

const VALID_PLANS   = ['nocturne', 'abyssal'] as const;
const VALID_PERIODS = ['week', 'month', 'year'] as const;

export const getMySubscription = async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
        plan:   user.subscriptionPlan,
        period: user.subscriptionPeriod,
    });
};

export const subscribe = async (req: AuthRequest, res: Response) => {
    const { plan, period } = req.body;
    if (!VALID_PLANS.includes(plan) || !VALID_PERIODS.includes(period)) {
        res.status(400).json({ message: 'Plan ou période invalide' });
        return;
    }
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
