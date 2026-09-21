import { Response } from 'express';
import mongoose from 'mongoose';
import { Match } from '../match.model.js';
import { Profile } from '../../profile/profile.model.js';
import { Event } from '../../event/event.model.js';
import { User } from '../../../shared/models/user.model.js';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { PLAN_LIMITS } from '../../subscription/limits.js';
import { buildSuggestions } from './build-suggestions.js';
import { getTagFrequency } from './tag-frequency.js';

// Title of the next approved event both people are registered to, if any.
async function findCommonEventTitle(a: mongoose.Types.ObjectId, b: mongoose.Types.ObjectId): Promise<string | null> {
    const event = await Event.findOne({
        status:    'approved',
        date:      { $gte: new Date() },
        attendees: { $all: [a, b] },
    }).sort({ date: 1 }).select('title');
    return event?.title ?? null;
}

export async function getMatchSuggestions(req: AuthRequest, res: Response): Promise<void> {
    const matchId = req.params.matchId as string;
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
        res.status(400).json({ message: 'Invalid match id' });
        return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const match  = await Match.findById(matchId);
    if (!match || !match.users.some((id) => id.equals(userId))) {
        res.status(403).json({ message: 'Access denied' });
        return;
    }
    const otherId = match.users.find((id) => !id.equals(userId));

    const [user, myProfile, otherProfile] = await Promise.all([
        User.findById(userId).select('subscriptionPlan'),
        Profile.findOne({ owner: userId }),
        Profile.findOne({ owner: otherId }),
    ]);
    if (!user || !myProfile || !otherProfile || !otherId) {
        res.status(404).json({ message: 'Profile not found' });
        return;
    }

    const [frequency, commonEvent] = await Promise.all([
        getTagFrequency(Boolean(myProfile.isTestAccount)),
        findCommonEventTitle(userId, otherId),
    ]);

    // How many suggestions to return comes from the plan, never from the client.
    res.json(buildSuggestions({
        me:    myProfile,
        other: otherProfile,
        frequency,
        commonEvent,
        seed:  matchId,
        limit: PLAN_LIMITS.suggestionsPerMatch[user.subscriptionPlan],
    }));
}
