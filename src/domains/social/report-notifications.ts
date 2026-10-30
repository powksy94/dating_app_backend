import { User } from '../../shared/models/user.model.js';
import { sendPushNotification } from '../../shared/services/notification.service.js';
import { pushTexts } from '../../shared/services/push-messages.js';

// Notifies every reporter (deduplicated) that a report they filed led to the
// reported account being banned. Never called on dismissal, only on ban.
export async function notifyReportersActioned(reporterIds: string[]): Promise<void> {
    if (reporterIds.length === 0) return;

    const users = await User.find({ _id: { $in: reporterIds } }).select('fcmToken locale');

    await Promise.all(users.map(user => user.fcmToken
        ? sendPushNotification(
            user.fcmToken,
            pushTexts(user.locale).reportActionedTitle,
            pushTexts(user.locale).reportActionedBody,
            { type: 'report_actioned' },
        )
        : Promise.resolve()));
}
