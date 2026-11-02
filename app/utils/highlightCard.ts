const LINE_GAP = 12;

// the card sits right of the highlight line, or left of it when it would leave the plot
export function cardLeft(lineX: number, width: number, contentLeft: number, contentRight: number): number {
    return lineX + LINE_GAP + width <= contentRight ? lineX + LINE_GAP : Math.max(contentLeft, lineX - LINE_GAP - width);
}

// card size from its measured texts: an optional title line, then one line per row (dot, name, value)
export function cardMetrics({
    hasTitle,
    namesWidth,
    rowCount,
    scale,
    titleWidth,
    valuesWidth
}: {
    titleWidth: number;
    namesWidth: number;
    valuesWidth: number;
    rowCount: number;
    hasTitle: boolean;
    scale: number;
}) {
    const padding = 10 * scale;
    const lineHeight = 18 * scale;
    const dotSpace = 14 * scale;
    const width = Math.max(titleWidth, dotSpace + namesWidth + 12 * scale + valuesWidth) + 2 * padding;
    const height = (rowCount + (hasTitle ? 1 : 0)) * lineHeight + 2 * padding;
    return { width, height, padding, lineHeight, dotSpace };
}
