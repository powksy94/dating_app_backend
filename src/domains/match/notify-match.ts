import mongoose from 'mongoose';
import { Profile } from '../profile/profile.model.js';
import { User } from '../../shared/models/user.model.js';
import { sendPushNotification } from '../../shared/services/notification.service.js';
import { pushTexts } from '../../shared/services/push-messages.js';

type Recipient = { fcmToken?: string; locale?: string } | null;
type OtherProfile = { username?: string } | null;

/**
 * Tells both people that they matched, each notification written in the
 * language of its own recipient.
 */
export async function notifyMatch(
    fromId:  mongoose.Types.ObjectId,
    toId:    mongoose.Types.ObjectId,
    matchId: string,
): Promise<void> {
    const [fromProfile, toProfile, fromUser, toUser] = await Promise.all([
        Profile.findOne({ owner: fromId }).select('username'),
        Profile.findOne({ owner: toId }).select('username'),
        User.findById(fromId).select('fcmToken locale'),
        User.findById(toId).select('fcmToken locale'),
    ]);

    const notify = async (recipient: Recipient, other: OtherProfile) => {
        if (!recipient?.fcmToken) return;
        const t = pushTexts(recipient.locale);
        await sendPushNotification(
            recipient.fcmToken,
            t.newMatchTitle,
            t.newMatchBody(other?.username ?? t.someone),
            { matchId, type: 'match' },
        );
    };

    await notify(toUser, fromProfile);
    await notify(fromUser, toProfile);
}
