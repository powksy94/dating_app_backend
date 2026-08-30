import { Request, Response } from "express";
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken';
import { Admin } from "./admin.model.js";
import { User } from "../../shared/models/user.model.js";
import { sendPushNotification } from "../../shared/services/notification.service.js";
import { AuthRequest } from "../../shared/middleware/auth.middleware.js";

interface Session {
    adminId?:      string;
    linkedUserId?: string;
    status:        'pending' | 'approved' | 'denied';
    token?:        string;
    expiresAt:     number;
}

const sessions = new Map<string, Session>();
const TTL_MS = 5 * 60 * 1000;

function cleanup() {
    const now = Date.now();
    for (const [id, s] of sessions) {
        if (s.expiresAt < now) sessions.delete(id);
    }
}

setInterval(cleanup, 60_000);

export async function requestAuth(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: 'email requis' }); return; }

    const sessionId = randomUUID();

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    const user  = admin?.linkedUserId
        ? await User.findById(admin.linkedUserId).select('fcmToken')
        : null;

    cleanup();
    sessions.set(sessionId, {
        adminId:      admin?._id.toString(),
        linkedUserId: admin?.linkedUserId?.toString(),
        status:       'pending',
        expiresAt:    Date.now() + TTL_MS,
    });

    // Anti-énumération : réponse identique que l'email soit admin ou non
    if (admin && user?.fcmToken) {
        sendPushNotification(
            user.fcmToken,
            '🔐 Connexion admin',
            'Demande de connexion au panel admin. Approuves-tu ?',
            { type: 'admin_auth', sessionId },
        ).catch(() => {});
    }

    res.json({ sessionId });
}

export function checkStatus(req: Request, res: Response): void {
    const { sessionId } = req.params as { sessionId: string };
    const session = sessions.get(sessionId);

    if (!session || Date.now() > session.expiresAt) {
        sessions.delete(sessionId);
        res.json({ status: 'denied' });
        return;
    }

    if (session.status === 'approved') {
        const token = session.token;
        sessions.delete(sessionId);
        res.json({ status: 'approved', token });
        return;
    }

    res.json({ status: session.status });
}

export async function respondAuth(req: AuthRequest, res: Response): Promise<void> {
    const { sessionId, approved } = req.body;
    if (!sessionId || approved === undefined) {
        res.status(400).json({ message: 'sessionId et approved requis' });
        return;
    }

    const session = sessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
        sessions.delete(sessionId);
        res.status(404).json({ message: 'Session expirée ou introuvable' });
        return;
    }

    if (!session.linkedUserId || req.userId !== session.linkedUserId) {
        res.status(403).json({ message: 'Non autorisé' });
        return;
    }

    if (!approved) {
        session.status = 'denied';
        res.sendStatus(204);
        return;
    }

    const admin = await Admin.findById(session.adminId);
    if (!admin) { res.status(500).json({ message: 'Admin introuvable' }); return; }

    const token = jwt.sign(
        { userId: admin._id.toString(), email: admin.email, role: 'admin' },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
    );

    session.status = 'approved';
    session.token  = token;
    res.sendStatus(204);
}
