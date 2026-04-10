import { Response } from "express";
import { Like } from "../models/like.model.js";
import { Match } from "../models/match.model.js";
import { Profile } from "../models/profile.model.js";
import { Elegie } from "../models/elegie.model.js";
import { Message } from "../models/message.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

export async function likeUser(req: AuthRequest, res: Response): Promise<void> {
    const fromId = new mongoose.Types.ObjectId(req.userId);
    const toId   = new mongoose.Types.ObjectId(req.params.targetId as string);
    
    if (fromId.equals(toId)) {
        res.status(400).json({ message: 'Impossible de se liker soi-même'});
        return;
    }

    await Like.updateOne({ from: fromId, to: toId }, {}, { upsert: true });

    const mutual = await Like.findOne({ from: toId, to: fromId });
    if (mutual) {
        let matchDoc = await Match.findOne({ users: { $all: [fromId, toId] }});
        if (!matchDoc) {
            matchDoc = await Match.create({ users: [fromId, toId] });
        }
        // Si l'utilisateur avait envoyé une élégie → la marquer matched + premier message
        const elegie = await Elegie.findOneAndUpdate(
            { from: fromId, to: toId, status: 'pending' },
            { status: 'matched' },
            { new: true }
        );
        if (elegie) {
            await Message.create({
                matchId: matchDoc._id,
                sender:  fromId,
                text:    elegie.text,
            });
        }
        res.json({ match: true, matchId: matchDoc._id });
        return;
    }

    res.json({ match: false });
}

export async function dislikeUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const toId   = new mongoose.Types.ObjectId(req.params.targetId as string);

    // Si la cible nous a envoyé une élégie, incrémenter dislikeCount
    const elegie = await Elegie.findOne({ from: toId, to: userId, status: 'pending' });
    if (elegie) {
        elegie.dislikeCount += 1;
        if (elegie.dislikeCount >= 2) {
            elegie.status = 'rejected';
        }
        await elegie.save();
    }

    res.json({ ok: true });
}

export async function getLikedProfiles(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const likes = await Like.find({ from: userId }).sort({ createdAt: -1 });

    const result = await Promise.all(likes.map(async (like) => {
        const profile = await Profile.findOne(
            { owner: like.to },
            { username: 1, avatarUrl: 1, photos: 1, age: 1 }
        );
        const isMatch = await Match.exists({ users: { $all: [userId, like.to] } });
        return {
            uid:      like.to,
            username: profile?.username ?? 'Utilisateur inconnu',
            avatarUrl: profile?.avatarUrl ?? '',
            photos:   profile?.photos ?? [],
            age:      profile?.age ?? null,
            isMatch:  !!isMatch,
        };
    }));

    res.json(result);
}

export async function fecthSwipeProfiles(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // ID already liked by this user
    const liked = await Like.find({ from: userId }).distinct('to');

    const profiles = await Profile.find({
        owner: { $nin: [userId, ...liked] },
    }).limit(20);

    res.json(profiles);
}