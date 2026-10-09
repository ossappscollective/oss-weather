// hourly widget temperature curve: each value as a height between the lowest (0) and the highest (1)
export function curvePositions(values: number[]) {
    const known = values.filter((value) => Number.isFinite(value));
    const min = Math.min(...known);
    const range = Math.max(...known) - min;
    return values.map((value) => (Number.isFinite(value) && range > 0 ? (value - min) / range : 0.5));
}

// daily widget range bars: each day min / max on the range of the whole period (0-1)
export function rangePositions(lows: number[], highs: number[]) {
    const min = Math.min(...lows.filter((value) => Number.isFinite(value)));
    const range = Math.max(...highs.filter((value) => Number.isFinite(value))) - min;
    return lows.map((low, index) => (range > 0 ? { start: (low - min) / range, end: (highs[index] - min) / range } : { start: 0, end: 1 }));
}
