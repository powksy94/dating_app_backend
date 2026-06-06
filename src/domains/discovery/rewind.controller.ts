import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Like } from '../discovery/like.model.js';
import { Match } from '../match/match.model.js';
import { User } from '../../shared/models/user.model.js';
import { PLAN_LIMITS } from '../subscription/limits.js';
import mongoose from 'mongoose';

export async function rewindLike(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const user = await User.findById(userId);
    if (!user) { res.status(401).json({ message: 'Utilisateur introuvable' }); return; }

    if (!PLAN_LIMITS.rewind[user.subscriptionPlan]) {
        res.status(403).json({
            code:         'PLAN_REQUIRED',
            message:      'Le rewind nécessite un abonnement Nocturne ou Abyssal',
            requiredPlan: 'nocturne',
        });
        return;
    }

    const lastLike = await Like.findOne({ from: userId }).sort({ createdAt: -1 });
    if (!lastLike) {
        res.status(404).json({ message: 'Aucun like à annuler' });
        return;
    }

    const targetId = lastLike.to;
    await lastLike.deleteOne();
    await Match.deleteOne({ users: { $all: [userId, targetId] } });

    res.json({ ok: true, rewindedUserId: targetId });
}
