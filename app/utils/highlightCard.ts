const LINE_GAP = 12;
const MIN_ROW_SCALE = 0.7;

// the card sits right of the highlight line, or left of it when it would leave the plot
export function cardLeft(lineX: number, width: number, contentLeft: number, contentRight: number): number {
    return lineX + LINE_GAP + width <= contentRight ? lineX + LINE_GAP : Math.max(contentLeft, lineX - LINE_GAP - width);
}

// card size from its measured parts: a header, then the rows in as few columns as possible. A column
// that is too tall first shrinks its rows (down to a minimum), then the rows go to one more column.
// availableHeight 0 = unknown
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
    const result = (columns: number, shownRowHeight: number) => {
        const rowsPerColumn = Math.ceil(rowCount / columns);
        return {
            columns,
            rowsPerColumn,
            rowHeight: shownRowHeight,
            width: Math.max(headerWidth, columns * columnWidth + (columns - 1) * columnGap) + 2 * padding,
            height: fixedHeight + rowsPerColumn * shownRowHeight
        };
    };
    if (availableHeight <= 0) {
        return result(1, rowHeight);
    }
    for (let columns = 1; columns <= maxColumns; columns++) {
        const rowsPerColumn = Math.ceil(rowCount / columns);
        const fittingRowHeight = rowsPerColumn > 0 ? (availableHeight - fixedHeight) / rowsPerColumn : rowHeight;
        if (fittingRowHeight >= rowHeight) {
            return result(columns, rowHeight);
        }
        if (fittingRowHeight >= rowHeight * MIN_ROW_SCALE || columns === maxColumns) {
            return result(columns, Math.max(rowHeight * MIN_ROW_SCALE, fittingRowHeight));
        }
    }
    return result(maxColumns, rowHeight * MIN_ROW_SCALE);
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
