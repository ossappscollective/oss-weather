export type GroupPosition = 'single' | 'first' | 'middle' | 'last';

// rows drawn outside of the cards
const UNGROUPED_TYPES = ['header', 'sectionheader', 'info'];

function isGroupedRow(index: number, count: number, typeAt: (index: number) => string | undefined) {
    return index >= 0 && index < count && UNGROUPED_TYPES.indexOf(typeAt(index)) === -1;
}

// where a row sits in its card: the rows between two section headers share one card
export function groupPosition(index: number, count: number, typeAt: (index: number) => string | undefined): GroupPosition | undefined {
    if (!isGroupedRow(index, count, typeAt)) {
        return undefined;
    }
    const hasPrevious = isGroupedRow(index - 1, count, typeAt);
    const hasNext = isGroupedRow(index + 1, count, typeAt);
    if (hasPrevious && hasNext) {
        return 'middle';
    }
    if (hasPrevious) {
        return 'last';
    }
    return hasNext ? 'first' : 'single';
}
