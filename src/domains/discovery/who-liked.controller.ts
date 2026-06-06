import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Like } from '../discovery/like.model.js';
import { Match } from '../match/match.model.js';
import { Profile } from '../profile/profile.model.js';
import { User } from '../../shared/models/user.model.js';
import { PLAN_LIMITS } from '../subscription/limits.js';
import mongoose from 'mongoose';

export async function whoLikedMe(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const user = await User.findById(userId);
    if (!user) { res.status(401).json({ message: 'Utilisateur introuvable' }); return; }

    if (!PLAN_LIMITS.whoLikedMe[user.subscriptionPlan]) {
        res.status(403).json({
            code:         'PLAN_REQUIRED',
            message:      'Voir qui t\'a liké nécessite un abonnement Nocturne ou Abyssal',
            requiredPlan: 'nocturne',
        });
        return;
    }

    const likes = await Like.find({ to: userId }).sort({ createdAt: -1 });

    const result = await Promise.all(likes.map(async (like) => {
        const profile = await Profile.findOne({ owner: like.from }, { username: 1, avatarUrl: 1, age: 1 });
        const isMatch = await Match.exists({ users: { $all: [userId, like.from] } });
        return {
            uid:       like.from,
            username:  profile?.username ?? 'Utilisateur inconnu',
            avatarUrl: profile?.avatarUrl ?? '',
            age:       profile?.age ?? null,
            isMatch:   !!isMatch,
            likedAt:   (like as any).createdAt,
        };
    }));

    res.json(result);
}
