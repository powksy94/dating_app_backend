import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Elegie } from '../models/elegie.model.js';
import { Like } from '../models/like.model.js';
import { Match } from '../models/match.model.js';
import { Message } from '../models/message.model.js';
import { Profile } from '../models/profile.model.js';
import { User } from '../models/user.model.js';
import { sendPushNotification } from '../services/notification.service.js';
import mongoose from 'mongoose';

export async function sendElegie(req: AuthRequest, res: Response): Promise<void> {
    const fromId   = new mongoose.Types.ObjectId(req.userId);
    const toId     = new mongoose.Types.ObjectId(String(req.params.targetId));
    const { text } = req.body as { text: string };

    if (!text || text.trim().length === 0) {
        res.status(400).json({ message: 'Le texte est requis' });
        return;
    }
    if (text.length > 200) {
        res.status(400).json({ message: 'Texte trop long (200 caractères max)' });
        return;
    }
    if (fromId.equals(toId)) {
        res.status(400).json({ message: 'Impossible de s\'envoyer une élégie à soi-même' });
        return;
    }

    const elegie = await Elegie.findOneAndUpdate(
        { from: fromId, to: toId },
        { text: text.trim(), status: 'pending', dislikeCount: 0 },
        { upsert: true, new: true }
    );

    // Si la cible a déjà liké l'expéditeur → match immédiat
    const alreadyLiked = await Like.findOne({ from: toId, to: fromId });
    if (alreadyLiked) {
        // Ajouter le like de l'expéditeur pour exclure le profil du feed
        await Like.updateOne({ from: fromId, to: toId }, {}, { upsert: true });

        let matchDoc = await Match.findOne({ users: { $all: [fromId, toId] } });
        if (!matchDoc) {
            matchDoc = await Match.create({ users: [fromId, toId] });
        }
        await Elegie.findByIdAndUpdate(elegie!._id, { status: 'matched' });
        await Message.create({
            matchId: matchDoc._id,
            sender:  fromId,
            text:    text.trim(),
        });
        // Notifications match aux deux
        const [fromProfile, toProfile, fromUser, toUser] = await Promise.all([
            Profile.findOne({ owner: fromId }).select('username'),
            Profile.findOne({ owner: toId }).select('username'),
            User.findById(fromId).select('fcmToken'),
            User.findById(toId).select('fcmToken'),
        ]);
        if (toUser?.fcmToken) {
            await sendPushNotification(
                toUser.fcmToken,
                '🖤 Nouveau match !',
                `Tu as matché avec ${fromProfile?.username ?? 'quelqu\'un'}`,
                { matchId: matchDoc._id.toString(), type: 'match' },
            );
        }
        if (fromUser?.fcmToken) {
            await sendPushNotification(
                fromUser.fcmToken,
                '🖤 Nouveau match !',
                `Tu as matché avec ${toProfile?.username ?? 'quelqu\'un'}`,
                { matchId: matchDoc._id.toString(), type: 'match' },
            );
        }

        res.json({ message: 'Élégie envoyée', match: true, matchId: matchDoc._id });
        return;
    }

    // Notification élégie reçue
    const [senderProfile, recipientUser] = await Promise.all([
        Profile.findOne({ owner: fromId }).select('username'),
        User.findById(toId).select('fcmToken'),
    ]);
    if (recipientUser?.fcmToken) {
        await sendPushNotification(
            recipientUser.fcmToken,
            '✉️ Nouvelle élégie',
            `${senderProfile?.username ?? 'Quelqu\'un'} t\'a envoyé une élégie`,
            { type: 'elegie', fromId: fromId.toString() },
        );
    }

    res.json({ message: 'Élégie envoyée', match: false });
}

export async function getReceived(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const elegies = await Elegie.find({ to: userId, status: 'pending' })
        .sort({ createdAt: -1 });

    const result = await Promise.all(elegies.map(async (e) => {
        const profile = await Profile.findOne(
            { owner: e.from },
            { username: 1, avatarUrl: 1 }
        );
        return {
            id:          e._id,
            fromId:      e.from,
            fromUsername: profile?.username ?? 'Utilisateur inconnu',
            fromAvatarUrl: profile?.avatarUrl ?? '',
            text:        e.text,
            status:      e.status,
            createdAt:   (e as any).createdAt,
        };
    }));

    res.json(result);
}

export async function getSent(req: AuthRequest, res: Response): Promise<void> {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const elegies = await Elegie.find({ from: userId, status: 'pending' })
        .sort({ createdAt: -1 });

    const result = await Promise.all(elegies.map(async (e) => {
        const profile = await Profile.findOne(
            { owner: e.to },
            { username: 1, avatarUrl: 1 }
        );
        return {
            id:           e._id,
            toId:         e.to,
            toUsername:   profile?.username ?? 'Utilisateur inconnu',
            toAvatarUrl:  profile?.avatarUrl ?? '',
            text:         e.text,
            status:       e.status,
            createdAt:    (e as any).createdAt,
        };
    }));

    res.json(result);
}
