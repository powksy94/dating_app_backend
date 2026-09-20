import { Message } from './message.model.js';
import { containsContactInfo } from './contact-info.js';
import { reportBlockedContactInfo } from '../social/auto-report.js';

/**
 * True when a message must be refused: it contains a link or a phone number and
 * the other person has not written a single message in this conversation yet.
 * Once they have replied the exchange is mutual and sharing is allowed.
 *
 * A refusal also raises an automatic report in the background (see
 * auto-report.ts): a single blocked attempt is minor, but a repeated one is
 * worth a human review.
 */
export async function isContactInfoRefused(
    matchId: string,
    senderId: string,
    text: unknown,
): Promise<boolean> {
    // Cheap text check first: the database is only queried for a suspect message.
    if (!containsContactInfo(text)) return false;
    const reply = await Message.exists({ matchId, sender: { $ne: senderId } });
    const refused = reply === null;
    if (refused) reportBlockedContactInfo(senderId, text as string).catch(() => {});
    return refused;
}
