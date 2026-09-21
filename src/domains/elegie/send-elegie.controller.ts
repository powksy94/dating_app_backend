import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { Elegie } from './elegie.model.js';
import { Like } from '../discovery/like.model.js';
import { Match } from '../match/match.model.js';
import { Message } from '../chat/message.model.js';
import { Profile } from '../profile/profile.model.js';
import { User } from '../../shared/models/user.model.js';
import { sendPushNotification } from '../../shared/services/notification.service.js';
import { pushTexts } from '../../shared/services/push-messages.js';
import { notifyMatch } from '../match/notify-match.js';
import { PLAN_LIMITS, monthStr } from '../subscription/limits.js';
import mongoose from 'mongoose';

export async function sendElegie(req: AuthRequest, res: Response): Promise<void> {
    const fromId   = new mongoose.Types.ObjectId(req.userId);
    const toId     = new mongoose.Types.ObjectId(String(req.params.targetId));
    const { text } = req.body as { text: string };

    if (!text || text.trim().length === 0) {
        res.status(400).json({ message: 'Text is required' }); return;
    }
    if (text.length > 200) {
        res.status(400).json({ message: 'Text too long (200 characters max)' }); return;
    }
    if (fromId.equals(toId)) {
        res.status(400).json({ message: 'You cannot send an elegy to yourself' }); return;
    }

    const user = await User.findById(fromId);
    if (!user) { res.status(401).json({ message: 'User not found' }); return; }

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
                message: `Limit of ${limit} elegies/month reached`,
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

        await notifyMatch(fromId, toId, matchDoc._id.toString());

        res.json({ message: 'Elegy sent', match: true, matchId: matchDoc._id });
        return;
    }

    const [senderProfile, recipientUser] = await Promise.all([
        Profile.findOne({ owner: fromId }).select('username'),
        User.findById(toId).select('fcmToken locale'),
    ]);
    if (recipientUser?.fcmToken) {
        const t = pushTexts(recipientUser.locale);
        await sendPushNotification(recipientUser.fcmToken, t.newElegyTitle,
            t.newElegyBody(senderProfile?.username ?? t.someone),
            { type: 'elegie', fromId: fromId.toString() });
    }

    res.json({ message: 'Elegy sent', match: false });
}
