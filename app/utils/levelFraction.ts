// filled part of a level bar (air quality, pollens): value on a 0..max scale, clamped
export function levelFraction(value: number | null, max: number) {
    if (value === null || !Number.isFinite(value)) {
        return 0;
    }
    return Math.min(1, Math.max(0, value / max));
}
