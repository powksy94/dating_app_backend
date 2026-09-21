import mongoose from 'mongoose';
import { Admin } from '../admin/admin.model.js';
import { User } from '../../shared/models/user.model.js';
import { sendPushNotification } from '../../shared/services/notification.service.js';
import { pushTexts } from '../../shared/services/push-messages.js';

// Notifies every admin linked to a mobile account that a user report is
// awaiting review, with the reason given by the reporter.
export async function notifyAdminsNewReport(reportedUsername: string, reason: string): Promise<void> {
    const admins = await Admin.find({ linkedUserId: { $exists: true } }).select('linkedUserId');
    if (admins.length === 0) return;

    const linkedUserIds = admins
        .map(a => a.linkedUserId)
        .filter((id): id is mongoose.Types.ObjectId => id !== undefined);
    const users = await User.find({ _id: { $in: linkedUserIds } }).select('fcmToken locale');

    const preview = reason.length > 80 ? `${reason.slice(0, 80)}...` : reason;

    await Promise.all(users.map(user => user.fcmToken
        ? sendPushNotification(
            user.fcmToken,
            pushTexts(user.locale).reportTitle,
            `${reportedUsername} : ${preview}`,
            { type: 'report_review' },
        )
        : Promise.resolve()));
}
