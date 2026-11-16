import { CountSlice } from "./count-by.js";

/** Keeps the [limit] largest slices (by count, [pinned] labels set aside
 * first so their size never affects the cut), folds the overflow into one
 * [otherLabel] slice (added only if there's anything to fold), then places
 * the [pinned] slices at the very end regardless of their size. */
export function keepTopSlices(
    slices: CountSlice[],
    limit: number,
    otherLabel: string,
    pinned: readonly string[] = [],
): CountSlice[] {
    const pinnedSlices  = slices.filter((s) => pinned.includes(s.label));
    const rest          = slices.filter((s) => !pinned.includes(s.label));

    const top       = rest.slice(0, limit);
    const overflow  = rest.slice(limit);

    const otherValue    = overflow.reduce((sum, s) => sum + s.value, 0);
    const other         = otherValue > 0 ? [{ label: otherLabel, value: otherValue }] : [];

    return [...top, ...other, ...pinnedSlices];
}