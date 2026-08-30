import mongoose from 'mongoose';
import { Admin } from '../admin/admin.model.js';
import { User } from '../../shared/models/user.model.js';
import { sendPushNotification } from '../../shared/services/notification.service.js';

// Notifies every admin linked to a mobile account that an event is
// awaiting moderation, with a short preview of its description.
export async function notifyAdminsNewEvent(eventId: string, title: string, description: string): Promise<void> {
    const admins = await Admin.find({ linkedUserId: { $exists: true } }).select('linkedUserId');
    if (admins.length === 0) return;

    const linkedUserIds = admins
        .map(a => a.linkedUserId)
        .filter((id): id is mongoose.Types.ObjectId => id !== undefined);
    const users = await User.find({ _id: { $in: linkedUserIds } }).select('fcmToken');

    const preview = description.length > 80 ? `${description.slice(0, 80)}...` : description;

    await Promise.all(users.map(user => user.fcmToken
        ? sendPushNotification(
            user.fcmToken,
            '📋 Évènement à valider',
            `${title} : ${preview}`,
            { type: 'event_review', eventId },
        )
        : Promise.resolve()));
}
