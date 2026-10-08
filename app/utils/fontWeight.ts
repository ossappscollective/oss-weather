// numeric value of a css font weight, kept inside a variable font weight axis range
export function variableFontWeight(weight: string | number | undefined, min: number, max: number) {
    let value: number;
    if (weight === 'bold') {
        value = 700;
    } else if (weight === undefined || weight === null || weight === 'normal') {
        value = 400;
    } else {
        value = typeof weight === 'number' ? weight : parseInt(weight, 10);
    }
    if (!Number.isFinite(value)) {
        value = 400;
    }
    return Math.min(max, Math.max(min, value));
}
