import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Visit } from './visit.model.js';
import { Profile } from '../profile/profile.model.js';
import { User } from '../../shared/models/user.model.js';
import { PLAN_LIMITS } from '../subscription/limits.js';
import mongoose from 'mongoose';

export async function getMyVisitors(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const user = await User.findById(userId);
    if (!user) { res.status(401).json({ message: 'Utilisateur introuvable' }); return; }

    if (!PLAN_LIMITS.whoVisitedMe[user.subscriptionPlan]) {
        res.status(403).json({
            code:         'PLAN_REQUIRED',
            message:      'Voir qui a visité ton profil nécessite un abonnement Nocturne ou Abyssal',
            requiredPlan: 'nocturne',
        });
        return;
    }

    const since   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const visits  = await Visit.find({ visited: userId, visitedAt: { $gte: since } })
        .sort({ visitedAt: -1 })
        .limit(100);

    const result = await Promise.all(visits.map(async (v) => {
        const profile = await Profile.findOne({ owner: v.visitor }, { username: 1, avatarUrl: 1, age: 1 });
        return {
            uid:       v.visitor,
            username:  profile?.username ?? 'Utilisateur inconnu',
            avatarUrl: profile?.avatarUrl ?? '',
            age:       profile?.age ?? null,
            visitedAt: v.visitedAt,
        };
    }));

    res.json(result);
}

export async function recordVisit(visitorId: string, visitedId: string): Promise<void> {
    if (visitorId === visitedId) return;
    await Visit.findOneAndUpdate(
        { visitor: new mongoose.Types.ObjectId(visitorId), visited: new mongoose.Types.ObjectId(visitedId) },
        { visitedAt: new Date() },
        { upsert: true }
    );
}
