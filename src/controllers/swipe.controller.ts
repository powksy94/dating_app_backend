import { Response } from "express";
import { Like } from "../models/like.model.js";
import { Match } from "../models/match.model.js";
import { Profile } from "../models/profile.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import mongoose  from "mongoose";

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
        // check if match already exists
        const existingMatch =  await Match.findOne({ users: { $all: [fromId, toId] }});
        if (!existingMatch) {
            await Match.create({ users: [fromId, toId] });
        }
        res.json({ match: true });
        return;
    }

    res.json({ match: false});
}

export async function dislikeUser(req: AuthRequest, res: Response): Promise<void> {
    // Dislike as a nevative like 
    // Profiles already liked will be excluded in fecthSwipeProfiles
    res.json({ ok: true });
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