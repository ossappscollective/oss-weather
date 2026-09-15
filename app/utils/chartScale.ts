export interface ValueRange {
    min: number;
    max: number;
}

// in raw storage units (see `defaultPropUnit`). Missing props fall back to their data range, hence
// pressure being listed: a 2 hPa wobble would otherwise be blown up to the full chart height
export const NATURAL_RANGES: Record<string, ValueRange> = {
    relativeHumidity: { min: 0, max: 100 },
    precipProbability: { min: 0, max: 100 },
    cloudCover: { min: 0, max: 100 },
    uvIndex: { min: 0, max: 11 },
    sealevelPressure: { min: 950, max: 1050 }
};

export function getNaturalRange(prop: string): ValueRange | undefined {
    return NATURAL_RANGES[prop];
}

export function computeDataRange(values: (number | null | undefined)[]): ValueRange | undefined {
    let min = Number.MAX_SAFE_INTEGER;
    let max = Number.MIN_SAFE_INTEGER;
    let found = false;
    for (const value of values) {
        if (value === null || value === undefined || isNaN(value)) {
            continue;
        }
        found = true;
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    return found ? { min, max } : undefined;
}

// temperature wins so the axis keeps the labels users expect and its gradient keeps matching the curve
export function pickReferenceProp<T extends string>(lineProps: T[]): T | undefined {
    return lineProps.find((prop) => prop === 'temperature') ?? lineProps[0];
}

// values outside `from` extrapolate rather than clamp, so an out-of-range reading stays visible
export function makeScaler(from: ValueRange, to: ValueRange): (value: number) => number {
    const middle = (to.min + to.max) / 2;
    if (from.max === from.min) {
        return () => middle;
    }
    const ratio = (to.max - to.min) / (from.max - from.min);
    return (value) => to.min + (value - from.min) * ratio;
}

// falls back while the axis has not been computed yet, which happens before the chart is sized
export function resolveRange(min: number, max: number, fallback: ValueRange): ValueRange {
    return isFinite(min) && isFinite(max) && max > min ? { min, max } : fallback;
}
