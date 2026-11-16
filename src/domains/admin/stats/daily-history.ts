import mongoose from "mongoose";

export interface HistoryPoint {
    date:       string;
    value:      number;
    cumulative: number;
}

export interface DailyHistoryResult {
    total:      number;
    history:    HistoryPoint[];
}

const DAY_MS = 24 * 60 * 60 * 1000; 

// Day key in Europe/Paris, matching the $dateToString timezone below —
// toISOString() would be UTC and could drift a day around midnight there.
function parisDateKey(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
}

/** Day-by-day count and running total for any model with a createdAt
 * (timestamps: true), over the last [days] days in the Europe/Paris
 * calendar. history has exactly [days] points, oldest first, 0 on days
 * with no activity; the last point's cumulative equals total. */
export async function dailyHistory(
    model: mongoose.Model<any>,
    days: number,
): Promise<DailyHistoryResult> {
    const now   = new Date();
    const since = new Date(now.getTime() - days * DAY_MS);

    const [total, rows] = await Promise.all([
        model.countDocuments(),
        model.aggregate([
            { $match: { createdAt: { $gte: since} } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Paris' } },
                value: { $sum: 1 },
            } },
        ]),
    ]);

    const valueByDate = new Map<string, number>(rows.map((r) => [r._id as string, r.value as number]));

    // Exact list of day keys, oldest to newest, so a day with no activity
    // still appears as 0 instead of being skipped.
    const dateKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
        dateKeys.push(parisDateKey(new Date(now.getTime() - i * DAY_MS)));
    }

    const periodSum = dateKeys.reduce((sum, key) => sum + (valueByDate.get(key) ?? 0), 0);

    let cumulative = total - periodSum;
    const history: HistoryPoint[] = dateKeys.map((date) => {
        const value = valueByDate.get(date) ?? 0;
        cumulative += value;
        return { date, value, cumulative };
    });

    return { total, history };
}