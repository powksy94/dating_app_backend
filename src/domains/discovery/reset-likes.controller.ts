import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Like } from '../discovery/like.model.js';
import { Match } from '../match/match.model.js';
import mongoose from 'mongoose';

export async function resetLikes(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // Keep the likes toward profiles already matched, so they don't reappear
    // in the discovery feed after the reset.
    const matches    = await Match.find({ users: userId });
    const matchedIds = matches.flatMap(m => m.users.filter(u => !u.equals(userId)));

    await Like.deleteMany({ from: userId, to: { $nin: matchedIds } });
    res.json({ message: 'Likes réinitialisés' });
}
