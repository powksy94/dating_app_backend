import { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Block } from './block.model.js';
import { Report } from './report.model.js';
import { Match } from '../match/match.model.js';
import { Like } from '../discovery/like.model.js';

export async function blockUser(req: AuthRequest, res: Response): Promise<void> {
    const blockerId = new mongoose.Types.ObjectId(req.userId);
    const targetId  = req.params['id'] as string;
    const blockedId = new mongoose.Types.ObjectId(targetId);

    if (blockerId.equals(blockedId)) {
        res.status(400).json({ message: 'Impossible de se bloquer soi-même' });
        return;
    }

    await Block.updateOne(
        { blocker: blockerId, blocked: blockedId },
        {},
        { upsert: true }
    );

    // Supprime le match existant si présent
    await Match.deleteOne({ users: { $all: [blockerId, blockedId] } });
    await Like.deleteMany({
        $or: [
            { from: blockerId, to: blockedId },
            { from: blockedId, to: blockerId },
        ],
    });

    res.json({ message: 'Utilisateur bloqué' });
}

export async function unblockUser(req: AuthRequest, res: Response): Promise<void> {
    const blockerId = new mongoose.Types.ObjectId(req.userId);
    const targetId  = req.params['id'] as string;
    const blockedId = new mongoose.Types.ObjectId(targetId);

    await Block.deleteOne({ blocker: blockerId, blocked: blockedId });
    res.json({ message: 'Utilisateur débloqué' });
}

export async function reportUser(req: AuthRequest, res: Response): Promise<void> {
    const reporterId = new mongoose.Types.ObjectId(req.userId);
    const targetId   = req.params['id'] as string;
    const reportedId = new mongoose.Types.ObjectId(targetId);
    const { reason } = req.body as { reason: string };

    if (!reason?.trim()) {
        res.status(400).json({ message: 'Une raison est requise' });
        return;
    }

    await Report.create({
        reporter: reporterId,
        reported: reportedId,
        reason:   reason.trim(),
    });

    res.json({ message: 'Signalement envoyé' });
}

export async function getBlockedIds(userId: string): Promise<string[]> {
    const blocks = await Block.find({ blocker: userId }).select('blocked');
    return blocks.map(b => b.blocked.toString());
}
