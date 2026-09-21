import { Profile } from '../../profile/profile.model.js';
import { TAG_FIELDS } from './suggestion-templates.js';

// How common each tag is among the profiles, which decides the tag put forward when
// two people share several (the rarest one) and whether the word "rare" may be used.
// A tag's popularity moves slowly, so a daily refresh is plenty. If the base grows,
// this can become a nightly job writing a snapshot (see the feature notes).
const CACHE_MS = 24 * 60 * 60 * 1000;

export interface TagFrequency {
    /** Profiles counted. Below a few dozen, shares say nothing reliable. */
    total: number;
    /** Share of the profiles that carry the tag, from 0 to 1. */
    share(tag: string): number;
}

interface Snapshot { at: number; frequency: TagFrequency }

// One snapshot per pool: test accounts are counted among themselves only, like
// everywhere else (a real user must never be influenced by test data).
const cache = new Map<boolean, Snapshot>();

// An old profile has no isTestAccount field: it counts as a real one.
const poolFilter = (testPool: boolean) => ({ isTestAccount: testPool ? true : { $ne: true } });

async function compute(testPool: boolean): Promise<TagFrequency> {
    const pool = poolFilter(testPool);
    const [total, rows] = await Promise.all([
        Profile.countDocuments(pool),
        Profile.aggregate<{ _id: string; count: number }>([
            { $match: pool },
            { $project: { tags: { $setUnion: TAG_FIELDS.map((field) => ({ $ifNull: [`$${field}`, []] })) } } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
        ]),
    ]);
    const counts = new Map(rows.map((row) => [row._id, row.count]));
    return {
        total,
        share: (tag) => (total === 0 ? 0 : (counts.get(tag) ?? 0) / total),
    };
}

export async function getTagFrequency(testPool: boolean): Promise<TagFrequency> {
    const cached = cache.get(testPool);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.frequency;
    const frequency = await compute(testPool);
    cache.set(testPool, { at: Date.now(), frequency });
    return frequency;
}
