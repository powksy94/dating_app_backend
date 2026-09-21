import { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Block } from './block.model.js';
import { Report } from './report.model.js';
import { Match } from '../match/match.model.js';
import { Like } from '../discovery/like.model.js';
import { Profile } from '../profile/profile.model.js';
import { notifyAdminsNewReport } from './notify-admins-new-report.js';
import { Admin } from '../admin/admin.model.js';
import { inSameTestPool } from '../discovery/test-pool.js';

export async function blockUser(req: AuthRequest, res: Response): Promise<void> {
    const blockerId = new mongoose.Types.ObjectId(req.userId);
    const targetId  = req.params['id'] as string;
    const blockedId = new mongoose.Types.ObjectId(targetId);

    if (blockerId.equals(blockedId)) {
        res.status(400).json({ message: 'You cannot block yourself' });
        return;
    }

    await Block.updateOne(
        { blocker: blockerId, blocked: blockedId },
        {},
        { upsert: true }
    );

    // Delete the existing match if present
    await Match.deleteOne({ users: { $all: [blockerId, blockedId] } });
    await Like.deleteMany({
        $or: [
            { from: blockerId, to: blockedId },
            { from: blockedId, to: blockerId },
        ],
    });

    res.json({ message: 'User blocked' });
}

export async function unblockUser(req: AuthRequest, res: Response): Promise<void> {
    const blockerId = new mongoose.Types.ObjectId(req.userId);
    const targetId  = req.params['id'] as string;
    const blockedId = new mongoose.Types.ObjectId(targetId);

    await Block.deleteOne({ blocker: blockerId, blocked: blockedId });
    res.json({ message: 'User unblocked' });
}

export async function reportUser(req: AuthRequest, res: Response): Promise<void> {
    const reporterId = new mongoose.Types.ObjectId(req.userId);
    const targetId   = req.params['id'] as string;
    const reportedId = new mongoose.Types.ObjectId(targetId);
    const { reason } = req.body as { reason: string };

    if (!reason?.trim()) {
        res.status(400).json({ message: 'A reason is required' });
        return;
    }

    // The feed already keeps test and real accounts apart, but the target id
    // comes straight from the client: re-check here so a direct call can't cross
    // (same rule as swipe.controller.ts's likeUser/dislikeUser).
    if (!await inSameTestPool(reporterId.toString(), reportedId.toString())) {
        res.status(404).json({ message: 'User not found' });
        return;
    }

    await Report.create({
        reporter: reporterId,
        reported: reportedId,
        reason:   reason.trim(),
    });

    const reportedProfile = await Profile.findOne({ owner: reportedId }).select('username');
    notifyAdminsNewReport(reportedProfile?.username ?? 'Utilisateur', reason.trim()).catch(() => {});

    res.json({ message: 'Report sent' });
}

export async function getIsLinkedAdmin(req: AuthRequest, res: Response): Promise<void> {
    const admin = await Admin.findOne({ linkedUserId: req.userId });
    res.json({ isAdmin: !!admin });
}

export async function getBlockedIds(userId: string): Promise<string[]> {
    const blocks = await Block.find({ blocker: userId }).select('blocked');
    return blocks.map(b => b.blocked.toString());
}
