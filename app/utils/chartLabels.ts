// indexes worth labelling on a line: both ends and each local high/low (middle of a flat one),
// skipping those within minDelta of the previous label
export function extremaIndexes(values: number[], minDelta: number): number[] {
    if (values.length === 0) {
        return [];
    }
    const candidates = [0];
    let index = 1;
    while (index < values.length - 1) {
        let plateauEnd = index;
        while (plateauEnd + 1 < values.length - 1 && values[plateauEnd + 1] === values[index]) {
            plateauEnd++;
        }
        const previous = values[index - 1];
        const next = values[plateauEnd + 1];
        const value = values[index];
        if ((value > previous && value > next) || (value < previous && value < next)) {
            candidates.push(Math.floor((index + plateauEnd) / 2));
        }
        index = plateauEnd + 1;
    }
    if (values.length > 1) {
        candidates.push(values.length - 1);
    }
    const kept: number[] = [];
    for (const candidate of candidates) {
        if (kept.length === 0 || Math.abs(values[candidate] - values[kept[kept.length - 1]]) >= minDelta) {
            kept.push(candidate);
        }
    }
    return kept;
}

// a vertical gradient starts at y=0 of the canvas, the plot area lower: extend the range above the plot
// so that the plot top maps to max and its bottom to min
export function contentGradientRange(min: number, max: number, contentTop: number, contentHeight: number) {
    return { min, max: max + ((max - min) * contentTop) / contentHeight, height: contentTop + contentHeight };
}

// axis spaces (in data units) leaving bottomPx under the lowest value and topPx over the highest one
export function plotPadding(dataMin: number, dataMax: number, contentHeight: number, bottomPx: number, topPx: number) {
    const dataHeight = contentHeight - bottomPx - topPx;
    const range = dataMax - dataMin;
    if (dataHeight <= 0 || !(range > 0)) {
        return { spaceMin: 0, spaceMax: 0 };
    }
    return { spaceMin: (range * bottomPx) / dataHeight, spaceMax: (range * topPx) / dataHeight };
}

// hour ranges to shade as night, from the entries times: forecasts are not always hourly
export function nightSpans(entries: { hours: number; isDay?: boolean }[]): { from: number; to: number }[] {
    const spans: { from: number; to: number }[] = [];
    entries.forEach((entry, index) => {
        if (entry.isDay !== false) {
            return;
        }
        const previous = entries[index - 1];
        const next = entries[index + 1];
        // at the ends, the step of the only neighbour (or an hour)
        const step = next ? next.hours - entry.hours : previous ? entry.hours - previous.hours : 1;
        const from = previous ? (previous.hours + entry.hours) / 2 : entry.hours - step / 2;
        const to = next ? (entry.hours + next.hours) / 2 : entry.hours + step / 2;
        const last = spans[spans.length - 1];
        if (last && last.to === from) {
            last.to = to;
        } else {
            spans.push({ from, to });
        }
    });
    return spans;
}
