import { User } from "../../../shared/models/user.model.js";

export type StatsMetric = 'users' | 'profiles' | 'likes' | 'matches' | 'messages';

// Mongoose 9 renamed its own filter type, so a plain object keeps this
// independent of whatever Mongoose currently calls it.
export type MongoFilter = Record<string, unknown>;

// An old document has no isTestAccount field at all (the schema default only
// applies at creation): it counts as a real account, not a test one.
export const NOT_TEST_ACCOUNT: MongoFilter = { isTestAccount: { $ne: true } };

/** The filter each stats metric's query needs to exclude test accounts.
 * User/Profile carry isTestAccount directly; Like/Match/Message don't, but
 * test and real accounts never interact (see discovery/test-pool.ts), so
 * excluding by a single participant is enough. */
export async function realAccountsFilters(): Promise<Record<StatsMetric, MongoFilter>> {
    const testIds = await User.distinct('_id', { isTestAccount: true });

    return {
        users:      NOT_TEST_ACCOUNT,
        profiles:   NOT_TEST_ACCOUNT,
        likes:      { from: { $nin: testIds } },
        matches:    { users: { $nin: testIds } },
        messages:   { sender: { $nin: testIds } },
    };
}