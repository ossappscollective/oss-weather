// lowest and highest value across the compared models (at one time), and the gap between them
export function modelSpread(values: number[]) {
    const known = values.filter((value) => Number.isFinite(value));
    if (known.length < 2) {
        return null;
    }
    const min = Math.min(...known);
    const max = Math.max(...known);
    return { min, max, spread: max - min, count: known.length };
}
