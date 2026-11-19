export type Period = number | 'all';

export const DEFAULT_DAYS = 30;
export const MIN_DAYS = 7;
export const MAX_DAYS = 90;

/** Parses the days query parameter shared by the stats endpoints: an
 * integer (clamped to [MIN_DAYS, MAX_DAYS]), the string "all" (since the
 * app launched), or anything else, which falls back to DEFAULT_DAYS. */
export function parsePeriod(raw: unknown): Period {
    if (raw === 'all') return 'all';
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) return DEFAULT_DAYS;
    return Math.min(Math.max(parsed, MIN_DAYS), MAX_DAYS);
}