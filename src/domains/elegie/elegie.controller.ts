import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Elegie } from './elegie.model.js';
import { Profile } from '../profile/profile.model.js';
import mongoose from 'mongoose';

export async function getReceived(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const elegies = await Elegie.find({ to: userId, status: 'pending' }).sort({ createdAt: -1 });

    const result = await Promise.all(elegies.map(async (e) => {
        const profile = await Profile.findOne({ owner: e.from }, { username: 1, avatarUrl: 1 });
        return {
            id:             e._id,
            fromId:         e.from,
            fromUsername:   profile?.username ?? 'Utilisateur inconnu',
            fromAvatarUrl:  profile?.avatarUrl ?? '',
            text:           e.text,
            status:         e.status,
            createdAt:      (e as any).createdAt,
        };
    }));

    res.json(result);
}

export async function getSent(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const elegies = await Elegie.find({ from: userId, status: 'pending' }).sort({ createdAt: -1 });

    const result = await Promise.all(elegies.map(async (e) => {
        const profile = await Profile.findOne({ owner: e.to }, { username: 1, avatarUrl: 1 });
        return {
            id:           e._id,
            toId:         e.to,
            toUsername:   profile?.username ?? 'Utilisateur inconnu',
            toAvatarUrl:  profile?.avatarUrl ?? '',
            text:         e.text,
            status:       e.status,
            createdAt:    (e as any).createdAt,
        };
    }));

    res.json(result);
}

export async function getElegieStatus(req: AuthRequest, res: Response): Promise<void> {
    const { User } = await import('../../shared/models/user.model.js');
    const { PLAN_LIMITS, monthStr } = await import('../subscription/limits.js');

    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ message: 'Utilisateur introuvable' }); return; }

    const limit = PLAN_LIMITS.elegiesPerMonth[user.subscriptionPlan];
    if (limit === Infinity) { res.json({ limit: null, remaining: null, unlimited: true }); return; }

    const month = monthStr();
    const count = user.monthlyElegies.month === month ? user.monthlyElegies.count : 0;
    res.json({ limit, remaining: Math.max(0, limit - count), unlimited: false });
}
