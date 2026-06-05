import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Elegie } from '../models/elegie.model.js';
import { Like } from '../models/like.model.js';
import { Match } from '../models/match.model.js';
import { Message } from '../models/message.model.js';
import { Profile } from '../models/profile.model.js';
import { User } from '../models/user.model.js';
import { sendPushNotification } from '../services/notification.service.js';
import { PLAN_LIMITS, monthStr } from '../utils/subscription-limits.js';
import mongoose from 'mongoose';

export async function sendElegie(req: AuthRequest, res: Response): Promise<void> {
    const fromId   = new mongoose.Types.ObjectId(req.userId);
    const toId     = new mongoose.Types.ObjectId(String(req.params.targetId));
    const { text } = req.body as { text: string };

    if (!text || text.trim().length === 0) {
        res.status(400).json({ message: 'Le texte est requis' }); return;
    }
    if (text.length > 200) {
        res.status(400).json({ message: 'Texte trop long (200 caractères max)' }); return;
    }
    if (fromId.equals(toId)) {
        res.status(400).json({ message: 'Impossible de s\'envoyer une élégie à soi-même' }); return;
    }

    const user = await User.findById(fromId);
    if (!user) { res.status(401).json({ message: 'Utilisateur introuvable' }); return; }

    const limit = PLAN_LIMITS.elegiesPerMonth[user.subscriptionPlan];
    if (limit !== Infinity) {
        const month = monthStr();
        if (user.monthlyElegies.month !== month) {
            user.monthlyElegies.count = 0;
            user.monthlyElegies.month = month;
        }
        if (user.monthlyElegies.count >= limit) {
            res.status(403).json({
                code: 'ELEGIE_LIMIT_REACHED',
                message: `Limite de ${limit} élégies/mois atteinte`,
                limit, remaining: 0,
            });
            return;
        }
        user.monthlyElegies.count += 1;
        await user.save();
    }

    const elegie = await Elegie.findOneAndUpdate(
        { from: fromId, to: toId },
        { text: text.trim(), status: 'pending', dislikeCount: 0 },
        { upsert: true, new: true }
    );

    const alreadyLiked = await Like.findOne({ from: toId, to: fromId });
    if (alreadyLiked) {
        await Like.updateOne({ from: fromId, to: toId }, {}, { upsert: true });

        let matchDoc = await Match.findOne({ users: { $all: [fromId, toId] } });
        if (!matchDoc) matchDoc = await Match.create({ users: [fromId, toId] });

        await Elegie.findByIdAndUpdate(elegie!._id, { status: 'matched' });
        await Message.create({ matchId: matchDoc._id, sender: fromId, text: text.trim() });

        const [fromProfile, toProfile, fromUser, toUser] = await Promise.all([
            Profile.findOne({ owner: fromId }).select('username'),
            Profile.findOne({ owner: toId }).select('username'),
            User.findById(fromId).select('fcmToken'),
            User.findById(toId).select('fcmToken'),
        ]);
        if (toUser?.fcmToken) {
            await sendPushNotification(toUser.fcmToken, '🖤 Nouveau match !',
                `Tu as matché avec ${fromProfile?.username ?? 'quelqu\'un'}`,
                { matchId: matchDoc._id.toString(), type: 'match' });
        }
        if (fromUser?.fcmToken) {
            await sendPushNotification(fromUser.fcmToken, '🖤 Nouveau match !',
                `Tu as matché avec ${toProfile?.username ?? 'quelqu\'un'}`,
                { matchId: matchDoc._id.toString(), type: 'match' });
        }

        res.json({ message: 'Élégie envoyée', match: true, matchId: matchDoc._id });
        return;
    }

    const [senderProfile, recipientUser] = await Promise.all([
        Profile.findOne({ owner: fromId }).select('username'),
        User.findById(toId).select('fcmToken'),
    ]);
    if (recipientUser?.fcmToken) {
        await sendPushNotification(recipientUser.fcmToken, '✉️ Nouvelle élégie',
            `${senderProfile?.username ?? 'Quelqu\'un'} t\'a envoyé une élégie`,
            { type: 'elegie', fromId: fromId.toString() });
    }

    res.json({ message: 'Élégie envoyée', match: false });
}
