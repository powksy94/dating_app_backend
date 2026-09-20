import { Report } from './report.model.js';
import { Profile } from '../profile/profile.model.js';
import { notifyAdminsNewReport } from './notify-admins-new-report.js';
import { containsProfanity, THEME_WORDS } from '../../shared/data/profanity.js';

/**
 * Raises, refreshes or clears the automatic report about a bio.
 *
 * A bio with an insult is never refused: it is saved and sent for review, because
 * a long text produces false positives (dark-theme words are common with this
 * audience, hence THEME_WORDS). Only one automatic bio report stays open per
 * user: it is refreshed when the bio changes again, and removed once the bio is
 * clean.
 */
export async function reviewBio(userId: string, bio: string): Promise<void> {
    const filter = { reported: userId, source: 'auto' as const, topic: 'bio' };

    if (!containsProfanity(bio, THEME_WORDS)) {
        await Report.deleteOne(filter);
        return;
    }

    // The whole bio (700 characters at most) is kept, so the reviewer sees the
    // flagged word wherever it is.
    const reason = `Bio signalée automatiquement : « ${bio} »`;

    const refreshed = await Report.findOneAndUpdate(filter, { $set: { reason } });
    if (refreshed) return;

    await Report.create({ ...filter, reason });
    const profile = await Profile.findOne({ owner: userId }).select('username');
    notifyAdminsNewReport(profile?.username ?? 'Utilisateur', reason).catch(() => {});
}

/**
 * Raises or refreshes the automatic report about a blocked chat message (a link
 * or a phone number sent before the other person replied, see
 * chat/contact-guard.ts). Unlike the bio, there is no "clean" state to detect,
 * so this never clears the report: an admin dismisses it once reviewed. One
 * open report per user, refreshed with the latest attempt.
 */
export async function reportBlockedContactInfo(userId: string, text: string): Promise<void> {
    const filter = { reported: userId, source: 'auto' as const, topic: 'chat_contact_info' };
    const reason = `Lien ou numéro envoyé avant que l'autre personne ait répondu : « ${text} »`;

    const refreshed = await Report.findOneAndUpdate(filter, { $set: { reason } });
    if (refreshed) return;

    await Report.create({ ...filter, reason });
    const profile = await Profile.findOne({ owner: userId }).select('username');
    notifyAdminsNewReport(profile?.username ?? 'Utilisateur', reason).catch(() => {});
}
