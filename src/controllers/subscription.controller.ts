import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/user.model.js';

export const getMySubscription = async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
        plan: user.subscriptionPlan,
        period: user.subscriptionPeriod,
    });
};
