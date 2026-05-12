import { Response } from "express";
import { Match } from "../models/match.model.js";
import { Profile } from "../models/profile.model.js";
import { Message } from "../models/message.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

export async function getMyMatches(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const matches = await Match.find({ users: userId })

    const result = await Promise.all(matches.map(async (match) => {
        const otherUserId = match.users.find((u) => !u.equals(userId));

        const profile = await Profile.findOne(
            { owner: otherUserId },
            { username: 1, avatarUrl: 1 }
        );

        const lastMessage = await Message.findOne(
            { matchId: match._id },
            { text: 1, sender: 1, createdAt: 1 }
        ).sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
            matchId:      match._id,
            sender:       { $ne: userId },
            readBy:       { $ne: userId },
            deletedFor:   { $ne: userId },
            deletedForAll: false,
        });

        return {
            matchId:        match._id,
            userId:         otherUserId?.toString() ?? '',
            username:       profile?.username ?? 'Utilisateur inconnu',
            avatarUrl:      profile?.avatarUrl ?? '',
            unreadCount,
            lastMessage:    lastMessage
                ? { text: lastMessage.text, createdAt: (lastMessage as any).createdAt }
                : null,
        };
    }));

    res.json(result);
    
}