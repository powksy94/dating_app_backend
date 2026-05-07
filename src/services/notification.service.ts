import admin from '../config/firebase-admin.js';

export async function sendPushNotification(
    fcmToken:  string,
    title:     string,
    body:      string,
    data:      Record<string, string> = {},
): Promise<void> {
    try {
        await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data,
            android: {
                priority: 'high',
                notification: { sound: 'default', channelId: 'messages' },
            },
        });
    } catch (err) {
        console.error('[FCM] Erreur envoi notification:', err);
    }
}
