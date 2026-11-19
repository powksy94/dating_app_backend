import { User } from "../../../shared/models/user.model.js";
import { NOT_TEST_ACCOUNT } from "./real-accounts-filter.js";
import { MIN_DAYS } from "./period.js";

const DAYS_MS = 24 * 60 * 60 * 1000;

/** The oldest real account's createdAt — the app's effective launch date
 * for stats purposes — or null if there isn't one yet. */
export async function appLaunchDate(): Promise<Date | null> {
    const oldest = await User.findOne(NOT_TEST_ACCOUNT).sort({ createdAt: 1 }).select('createdAt').lean();
    return oldest?.createdAt ?? null;
}

/** Days to cover in a history query to span the app's whole lifetime: from
 * the oldest real account to now, +1 so the launch day itself falls inside
 * dailyHistory's window. Falls back to MIN_DAYS when there's no real
 * account yet. */
export async function daysSinceLaunch(): Promise<number> {
    const launch = await appLaunchDate();
    if (!launch) return MIN_DAYS;
    const days = Math.ceil((Date.now() - launch.getTime()) / DAYS_MS) + 1;
    return Math.max(MIN_DAYS, days);
}