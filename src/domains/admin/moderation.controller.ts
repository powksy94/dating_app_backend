import { Response } from 'express';
import mongoose from 'mongoose';
import { AdminRequest } from '../../shared/middleware/admin.middleware.js';
import { Report } from '../social/report.model.js';
import { User } from '../../shared/models/user.model.js';
import { Profile } from '../profile/profile.model.js';

export async function listReports(_req: AdminRequest, res: Response): Promise<void> {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(200).lean();

    const userIds = [...new Set(reports.flatMap(r => [r.reporter.toString(), r.reported.toString()]))];
    const [profiles, users] = await Promise.all([
        Profile.find({ owner: { $in: userIds } }).select('owner username').lean(),
        User.find({ _id: { $in: userIds } }).select('banned').lean(),
    ]);
    const usernameOf = new Map(profiles.map(p => [p.owner.toString(), p.username]));
    const bannedOf    = new Map(users.map(u => [(u._id as mongoose.Types.ObjectId).toString(), u.banned]));

    res.json(reports.map(r => ({
        id:       r._id,
        reason:   r.reason,
        createdAt: (r as any).createdAt,
        reporter: { id: r.reporter, username: usernameOf.get(r.reporter.toString()) ?? null },
        reported: {
            id:       r.reported,
            username: usernameOf.get(r.reported.toString()) ?? null,
            banned:   bannedOf.get(r.reported.toString()) ?? false,
        },
    })));
}

export async function dismissReport(req: AdminRequest, res: Response): Promise<void> {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Identifiant de signalement invalide' });
        return;
    }
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: 'Signalement classé sans suite' });
}

export async function banUser(req: AdminRequest, res: Response): Promise<void> {
    if (typeof req.params.userId !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
        res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        return;
    }
    const { reason } = req.body as { reason?: string };

    const user = await User.findByIdAndUpdate(req.params.userId, {
        banned:       true,
        bannedReason: reason?.trim() || 'Non spécifiée',
        // Force une reconnexion : la session en cours reste valide au plus
        // 1h (durée de vie du token d'accès), le refresh échouera ensuite.
        refreshToken: null,
    }, { new: true });

    if (!user) { res.status(404).json({ message: 'Utilisateur introuvable' }); return; }
    res.json({ message: 'Utilisateur banni' });
}

export async function unbanUser(req: AdminRequest, res: Response): Promise<void> {
    if (typeof req.params.userId !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
        res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        return;
    }
    const user = await User.findByIdAndUpdate(req.params.userId, {
        banned: false, bannedReason: undefined,
    }, { new: true });

    if (!user) { res.status(404).json({ message: 'Utilisateur introuvable' }); return; }
    res.json({ message: 'Utilisateur débanni' });
}
