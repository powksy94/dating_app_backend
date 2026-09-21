import { Response } from "express";
import { Like } from "../discovery/like.model.js";
import { Pass } from "../discovery/pass.model.js";
import { Match } from "../match/match.model.js";
import { Profile } from "../profile/profile.model.js";
import { Elegie } from "../elegie/elegie.model.js";
import { Message } from "../chat/message.model.js";
import { User, IUser } from "../../shared/models/user.model.js";
import { AuthRequest } from "../../shared/middleware/auth.middleware.js";
import { notifyMatch } from "../match/notify-match.js";
import { getBlockedIds } from "../social/user.controller.js";
import { inSameTestPool } from "./test-pool.js";
import { PLAN_LIMITS, Plan, todayStr } from "../subscription/limits.js";
import mongoose from "mongoose";

async function checkSwipeLimit(user: IUser): Promise<{ blocked: boolean; remaining: number | null }> {
    const limit = PLAN_LIMITS.swipesPerDay[user.subscriptionPlan];
    if (limit === Infinity) return { blocked: false, remaining: null };

    const today = todayStr();
    if (user.dailySwipes.date !== today) {
        user.dailySwipes.count = 0;
        user.dailySwipes.date  = today;
    }
    if (user.dailySwipes.count >= limit) return { blocked: true, remaining: 0 };

    user.dailySwipes.count += 1;
    await user.save();
    return { blocked: false, remaining: limit - user.dailySwipes.count };
}

export async function likeUser(req: AuthRequest, res: Response): Promise<void> {
    const fromId = new mongoose.Types.ObjectId(req.userId);
    const toId   = new mongoose.Types.ObjectId(req.params.targetId as string);

    if (fromId.equals(toId)) {
        res.status(400).json({ message: 'You cannot like yourself' });
        return;
    }

    // The feed already keeps test and real accounts apart, but the target id
    // comes straight from the client: re-check here so a direct call can't cross.
    if (!await inSameTestPool(fromId.toString(), toId.toString())) {
        res.status(403).json({ message: 'Profile not found' });
        return;
    }

    const user = await User.findById(fromId);
    if (!user) { res.status(401).json({ message: 'User not found' }); return; }

    const { blocked, remaining } = await checkSwipeLimit(user);
    if (blocked) {
        const limit = PLAN_LIMITS.swipesPerDay[user.subscriptionPlan];
        res.status(403).json({ code: 'SWIPE_LIMIT_REACHED', message: `Limit of ${limit} swipes/day reached`, limit, remaining: 0 });
        return;
    }

    await Like.updateOne({ from: fromId, to: toId }, {}, { upsert: true });

    const mutual = await Like.findOne({ from: toId, to: fromId });
    if (mutual) {
        let matchDoc = await Match.findOne({ users: { $all: [fromId, toId] } });
        if (!matchDoc) matchDoc = await Match.create({ users: [fromId, toId] });

        const elegie = await Elegie.findOneAndUpdate(
            { from: fromId, to: toId, status: 'pending' },
            { status: 'matched' },
            { new: true }
        );
        if (elegie) {
            await Message.create({ matchId: matchDoc._id, sender: fromId, text: elegie.text });
        }
        await notifyMatch(fromId, toId, matchDoc._id.toString());
        res.json({ match: true, matchId: matchDoc._id, remaining });
        return;
    }

    res.json({ match: false, remaining });
}

export async function dislikeUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const toId   = new mongoose.Types.ObjectId(req.params.targetId as string);

    if (!await inSameTestPool(userId.toString(), toId.toString())) {
        res.status(403).json({ message: 'Profile not found' });
        return;
    }

    const user = await User.findById(userId);
    if (user) {
        const { blocked } = await checkSwipeLimit(user);
        if (blocked) {
            const limit = PLAN_LIMITS.swipesPerDay[user.subscriptionPlan];
            res.status(403).json({ code: 'SWIPE_LIMIT_REACHED', message: `Limit of ${limit} swipes/day reached`, limit, remaining: 0 });
            return;
        }
    }

    const elegie = await Elegie.findOne({ from: toId, to: userId, status: 'pending' });
    if (elegie) {
        elegie.dislikeCount += 1;
        if (elegie.dislikeCount >= 2) elegie.status = 'rejected';
        await elegie.save();
    }

    await Pass.updateOne({ from: userId, to: toId }, {}, { upsert: true });

    res.json({ ok: true });
}

export async function getLikedProfiles(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const likes  = await Like.find({ from: userId }).sort({ createdAt: -1 });

    const result = await Promise.all(likes.map(async (like) => {
        const profile = await Profile.findOne({ owner: like.to }, { username: 1, avatarUrl: 1, photos: 1, age: 1 });
        const isMatch = await Match.exists({ users: { $all: [userId, like.to] } });
        return {
            uid: like.to, username: profile?.username ?? 'Unknown user',
            avatarUrl: profile?.avatarUrl ?? '', photos: profile?.photos ?? [],
            age: profile?.age ?? null, isMatch: !!isMatch,
        };
    }));

    res.json(result);
}


export async function getSwipeStatus(req: AuthRequest, res: Response): Promise<void> {
    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ message: 'User not found' }); return; }

    const limit = PLAN_LIMITS.swipesPerDay[user.subscriptionPlan];
    if (limit === Infinity) { res.json({ limit: null, remaining: null, unlimited: true }); return; }

    const today = todayStr();
    const count = user.dailySwipes.date === today ? user.dailySwipes.count : 0;
    res.json({ limit, remaining: Math.max(0, limit - count), unlimited: false });
}
