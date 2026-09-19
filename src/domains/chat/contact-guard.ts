import { Message } from './message.model.js';
import { containsContactInfo } from './contact-info.js';

/**
 * True when a message must be refused: it contains a link or a phone number and
 * the other person has not written a single message in this conversation yet.
 * Once they have replied the exchange is mutual and sharing is allowed.
 */
export async function isContactInfoRefused(
    matchId: string,
    senderId: string,
    text: unknown,
): Promise<boolean> {
    // Cheap text check first: the database is only queried for a suspect message.
    if (!containsContactInfo(text)) return false;
    const reply = await Message.exists({ matchId, sender: { $ne: senderId } });
    return reply === null;
}
