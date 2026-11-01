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
    if (!user) { res.status(401).json({ message: 'User not found' }); return; }

    if (!PLAN_LIMITS.whoLikedMe[user.subscriptionPlan]) {
        res.status(403).json({
            code:         'PLAN_REQUIRED',
            message:      'Seeing who liked you requires a Nocturne or Abyssal subscription',
            requiredPlan: 'nocturne',
        });
        return;
    }

    // Same age window the swipe feed applies (see swipe-feed.controller.ts),
    // so this list can't be used to see past a range the user chose not to see.
    const me     = await Profile.findOne({ owner: userId }).select('ageMin ageMax');
    const ageMin = me?.ageMin ?? 18;
    const ageMax = me?.ageMax ?? 99;

    const likes = await Like.find({ to: userId }).sort({ createdAt: -1 });

    const rows = await Promise.all(likes.map(async (like) => {
        const profile = await Profile.findOne({ owner: like.from }, { username: 1, avatarUrl: 1, age: 1, birthDate: 1 });

        // Computed from birthDate like the swipe feed; a profile with neither
        // birthDate nor the legacy age field is "unknown age" and kept, not excluded.
        const age = profile?.birthDate
            ? Math.floor((Date.now() - profile.birthDate.getTime()) / 31557600000)
            : profile?.age ?? null;
        if (age !== null && (age < ageMin || age > ageMax)) return null;

        const isMatch = await Match.exists({ users: { $all: [userId, like.from] } });
        return {
            uid:       like.from,
            username:  profile?.username ?? 'Unknown user',
            avatarUrl: profile?.avatarUrl ?? '',
            age,
            isMatch:   !!isMatch,
            likedAt:   (like as any).createdAt,
        };
    }));

    res.json(rows.filter((r): r is NonNullable<typeof r> => r !== null));
}
