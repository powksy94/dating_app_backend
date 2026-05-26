import { Request, Response } from "express";
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken';
import { Admin } from "../../models/admin.model.js";
import { User } from "../../models/user.model.js";
import { sendPushNotification } from "../../services/notification.service.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";

interface Session {
    email:     string;
    status:    'pending' | 'approved' | 'denied';
    token?:    string;
    expiresAt: number;
}

const sessions = new Map<string, Session>();
const TTL_MS = 5 * 60 * 1000;

function cleanup() {
    const now = Date.now();
    for (const [id, s] of sessions) {
        if (s.expiresAt < now) sessions.delete(id);
    }
}

export async function requestAuth(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: 'email requis' }); return; }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) { res.status(403).json({ message: 'Email non autorisé' }); return; }

    const user = await User.findOne({ email: email.toLowerCase() }).select('fcmToken');
    if (!user?.fcmToken) {
        res.status(400).json({ message: 'Aucun appareil enregistré pour cet admin' });
        return;
    }

    cleanup();

    const sessionId = randomUUID();
    sessions.set(sessionId, {
        email:     email.toLowerCase(),
        status:    'pending',
        expiresAt: Date.now() + TTL_MS,
    });

    await sendPushNotification(
        user.fcmToken,
        '🔐 Connexion admin',
        'Demande de connexion au panel admin. Approuves-tu ?',
        { type: 'admin_auth', sessionId },
    );

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

    const user = await User.findById(req.userId).select('email');
    if (!user || user.email !== session.email) {
        res.status(403).json({ message: 'Non autorisé' });
        return;
    }

    if (!approved) {
        session.status = 'denied';
        res.sendStatus(204);
        return;
    }

    const admin = await Admin.findOne({ email: session.email });
    if (!admin) { res.status(500).json({ message: 'Admin introuvable' }); return; }

    const token = jwt.sign(
        { adminId: admin._id, role: 'admin' },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
    );

    session.status = 'approved';
    session.token  = token;
    res.sendStatus(204);
}
