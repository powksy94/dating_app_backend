import { Profile } from '../profile/profile.model.js';
import { Admin } from '../admin/admin.model.js';

/**
 * True when the two accounts may see or interact with each other at all:
 * - Test accounts (internal/closed testing) only ever see other test
 *   accounts, and real users never see a test account.
 * - Among real (non-test) accounts: an account linked to an Admin doc never
 *   sees, likes, matches or messages a real user, and vice versa. Two
 *   admin-linked accounts (or two test accounts) are unaffected by this
 *   second rule.
 */
export async function canInteract(userIdA: string, userIdB: string): Promise<boolean> {
    const [a, b] = await Promise.all([
        Profile.findOne({ owner: userIdA }).select('isTestAccount'),
        Profile.findOne({ owner: userIdB }).select('isTestAccount'),
    ]);
    if (Boolean(a?.isTestAccount) !== Boolean(b?.isTestAccount)) return false;
    if (a?.isTestAccount) return true;

    const adminLinkedIds = (await Admin.find({ linkedUserId: { $exists: true } }).distinct('linkedUserId'))
        .map((id) => id.toString());
    return adminLinkedIds.includes(userIdA) === adminLinkedIds.includes(userIdB);
}
