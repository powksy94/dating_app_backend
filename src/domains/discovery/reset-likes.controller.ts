import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Like } from '../discovery/like.model.js';
import { Match } from '../match/match.model.js';
import mongoose from 'mongoose';

export async function resetLikes(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // Garde les likes vers des profils déjà matchés, pour qu'ils ne réapparaissent
    // pas dans le feed de découverte après la réinitialisation.
    const matches    = await Match.find({ users: userId });
    const matchedIds = matches.flatMap(m => m.users.filter(u => !u.equals(userId)));

    await Like.deleteMany({ from: userId, to: { $nin: matchedIds } });
    res.json({ message: 'Likes réinitialisés' });
}
