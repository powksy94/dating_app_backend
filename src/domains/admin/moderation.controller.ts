import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Report } from '../social/report.model.js';
import { User } from '../../shared/models/user.model.js';
import { Profile } from '../profile/profile.model.js';

// Typed as plain Request (not AdminRequest) so these handlers can be reused
// both by the web-admin router (admin JWT) and the mobile linked-admin
// router (regular mobile session) — neither needs the admin-specific fields.
export async function listReports(_req: Request, res: Response): Promise<void> {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(200).lean();

    // An automatic report has no reporter, only the reported user.
    const userIds = [...new Set(reports.flatMap(r =>
        [r.reporter?.toString(), r.reported.toString()].filter((id): id is string => Boolean(id))))];
    const [profiles, users] = await Promise.all([
        Profile.find({ owner: { $in: userIds } }).select('owner username isTestAccount').lean(),
        User.find({ _id: { $in: userIds } }).select('banned').lean(),
    ]);
    const usernameOf     = new Map(profiles.map(p => [p.owner.toString(), p.username]));
    const isTestAccountOf = new Map(profiles.map(p => [p.owner.toString(), p.isTestAccount]));
    const bannedOf    = new Map(users.map(u => [(u._id as mongoose.Types.ObjectId).toString(), u.banned]));

    res.json(reports.map(r => ({
        id:       r._id,
        reason:   r.reason,
        createdAt: (r as any).createdAt,
        // The review screens show this name, so an automatic report reads as such.
        // isTestAccount lets the review screen flag noise from testing, without
        // hiding it: a test account can be the only kind that exists pre-launch.
        reporter: r.reporter
            ? {
                id: r.reporter, username: usernameOf.get(r.reporter.toString()) ?? null,
                isTestAccount: isTestAccountOf.get(r.reporter.toString()) ?? false,
            }
            : { id: null, username: 'Nocturne (automatique)', isTestAccount: false },
        reported: {
            id:       r.reported,
            username: usernameOf.get(r.reported.toString()) ?? null,
            banned:   bannedOf.get(r.reported.toString()) ?? false,
            isTestAccount: isTestAccountOf.get(r.reported.toString()) ?? false,
        },
    })));
}

export async function dismissReport(req: Request, res: Response): Promise<void> {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid report id' });
        return;
    }
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report dismissed' });
}

export async function banUser(req: Request, res: Response): Promise<void> {
    if (typeof req.params.userId !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
        res.status(400).json({ message: 'Invalid user id' });
        return;
    }
    const { reason } = req.body as { reason?: string };

    const user = await User.findByIdAndUpdate(req.params.userId, {
        banned:       true,
        bannedReason: reason?.trim() || 'Non spécifiée',
        // Forces a re-login: the current session stays valid for at most
        // 1h (access token lifetime), the refresh will then fail.
        refreshToken: null,
    }, { new: true });

    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({ message: 'User banned' });
}

export async function unbanUser(req: Request, res: Response): Promise<void> {
    if (typeof req.params.userId !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
        res.status(400).json({ message: 'Invalid user id' });
        return;
    }
    const user = await User.findByIdAndUpdate(req.params.userId, {
        banned: false, bannedReason: undefined,
    }, { new: true });

    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({ message: 'User unbanned' });
}
