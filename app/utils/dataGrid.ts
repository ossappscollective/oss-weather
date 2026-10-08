export function gridColumnCount(width: number, minCellWidth: number, maxColumns: number) {
    return Math.max(1, Math.min(maxColumns, Math.floor(width / minCellWidth)));
}

export function layoutGrid(count: number, columns: number) {
    return {
        rowCount: Math.ceil(count / columns),
        cells: Array.from({ length: count }, (_, index) => ({ column: index % columns, row: Math.floor(index / columns) }))
    };
}

// where a day's min/max sit on the week's temperature scale, as 0..1 fractions
export function rangeBarSpan(min: number, max: number, weekMin: number, weekMax: number) {
    const range = weekMax - weekMin;
    if (range <= 0) {
        return { start: 0, end: 1 };
    }
    const toFraction = (value: number) => Math.min(1, Math.max(0, (value - weekMin) / range));
    return { start: toFraction(min), end: toFraction(max) };
}

// baseline drawing a glyph centered on centerY: icon glyphs are centered in their font box, not on text digits
export function centeredBaseline(centerY: number, ascent: number, descent: number) {
    return centerY - (ascent + descent) / 2;
}
