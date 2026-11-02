const LINE_GAP = 12;
const MIN_ROW_SCALE = 0.7;

// the card sits right of the highlight line, or left of it when it would leave the plot
export function cardLeft(lineX: number, width: number, contentLeft: number, contentRight: number): number {
    return lineX + LINE_GAP + width <= contentRight ? lineX + LINE_GAP : Math.max(contentLeft, lineX - LINE_GAP - width);
}

// card size from its measured parts: a header, then the rows in one column, or two when the plot is
// too short, with rows shrunk (down to a minimum) if that still does not fit. availableHeight 0 = unknown
export function cardLayout({
    availableHeight,
    columnGap,
    columnWidth,
    headerHeight,
    headerWidth,
    maxColumns = 2,
    padding,
    rowCount,
    rowHeight
}: {
    headerWidth: number;
    headerHeight: number;
    columnWidth: number;
    rowCount: number;
    rowHeight: number;
    padding: number;
    columnGap: number;
    availableHeight: number;
    maxColumns?: number;
}) {
    const fixedHeight = 2 * padding + headerHeight;
    let columns = 1;
    if (availableHeight > 0) {
        while (columns < maxColumns && fixedHeight + Math.ceil(rowCount / columns) * rowHeight > availableHeight) {
            columns++;
        }
    }
    const rowsPerColumn = Math.ceil(rowCount / columns);
    let shownRowHeight = rowHeight;
    if (availableHeight > 0 && rowsPerColumn > 0 && fixedHeight + rowsPerColumn * rowHeight > availableHeight) {
        shownRowHeight = Math.max(rowHeight * MIN_ROW_SCALE, (availableHeight - fixedHeight) / rowsPerColumn);
    }
    return {
        columns,
        rowsPerColumn,
        rowHeight: shownRowHeight,
        width: Math.max(headerWidth, columns * columnWidth + (columns - 1) * columnGap) + 2 * padding,
        height: fixedHeight + rowsPerColumn * shownRowHeight
    };
}

// text cut to fit maxWidth, ending with an ellipsis
export function ellipsize(text: string, maxWidth: number, measure: (text: string) => number) {
    if (measure(text) <= maxWidth) {
        return text;
    }
    let end = text.length - 1;
    while (end > 0 && measure(text.slice(0, end).trimEnd() + '…') > maxWidth) {
        end--;
    }
    return text.slice(0, end).trimEnd() + '…';
}
