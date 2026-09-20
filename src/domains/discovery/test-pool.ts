import { Profile } from '../profile/profile.model.js';

/**
 * True when the two accounts are in the same pool: both test accounts (internal
 * or closed testing) or both real ones. Test accounts must never surface to real
 * users, and vice versa.
 */
export async function inSameTestPool(userIdA: string, userIdB: string): Promise<boolean> {
    const [a, b] = await Promise.all([
        Profile.findOne({ owner: userIdA }).select('isTestAccount'),
        Profile.findOne({ owner: userIdB }).select('isTestAccount'),
    ]);
    return Boolean(a?.isTestAccount) === Boolean(b?.isTestAccount);
}
