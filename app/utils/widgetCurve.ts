// hourly widget temperature curve: each value as a height between the lowest (0) and the highest (1)
export function curvePositions(values: number[]) {
    const known = values.filter((value) => Number.isFinite(value));
    const min = Math.min(...known);
    const range = Math.max(...known) - min;
    return values.map((value) => (Number.isFinite(value) && range > 0 ? (value - min) / range : 0.5));
}
