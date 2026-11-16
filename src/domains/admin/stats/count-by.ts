export interface CountSlice {
    label: string;
    value: number;

    warning?: boolean;
}

/** Counts items by label. Labels listed in [order] come first, in that
 * order (only if non-empty); everything else follows, sorted by
 * descending count. */
export function countBy<T>(
    items: T[],
    labelOf: (item: T) => string,
    order: readonly string[] = [],
): CountSlice[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        const label = labelOf(item);
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    const ordered: CountSlice[] = [];
    for (const label of order) {
        const value = counts.get(label);
        if (value !== undefined) {
            ordered.push({ label, value });
            counts.delete(label);
        }
    }

    const rest = [...counts.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    
    return [...ordered, ...rest]
}