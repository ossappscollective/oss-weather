// number of daily aggregates to keep from hourly counts: only the trailing days with too few hours
// are dropped (the first day is the rest of today, partial by design)
export function keptDayCount(counts: number[], minCount: number) {
    let count = counts.length;
    while (count > 1 && counts[count - 1] < minCount) {
        count--;
    }
    return count;
}
