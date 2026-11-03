import type { Tide } from '~/services/providers/weather';

// The sea level every step from `from` to `to`, going from a tide to the next one on a cosine, like the real tide does.
// Before the first and after the last tide of the day the pattern goes on with the same intervals and heights.
export function tideCurve(tides: Tide[], from: number, to: number, step: number): { time: number; height: number }[] {
    if (tides.length < 2) {
        return [];
    }
    const extremes = tides.map(({ height, time }) => ({ height, time }));
    // tides not in time order would never reach the ends of the day
    if (extremes.some((extreme, index) => index > 0 && extreme.time <= extremes[index - 1].time)) {
        return [];
    }
    while (extremes[0].time > from) {
        extremes.unshift({ time: extremes[0].time - (extremes[1].time - extremes[0].time), height: extremes[1].height });
    }
    while (extremes[extremes.length - 1].time < to) {
        const last = extremes[extremes.length - 1];
        const previous = extremes[extremes.length - 2];
        extremes.push({ time: last.time + (last.time - previous.time), height: previous.height });
    }
    const curve: { time: number; height: number }[] = [];
    let segment = 0;
    for (let time = from; time <= to; time += step) {
        while (extremes[segment + 1].time < time) {
            segment++;
        }
        const start = extremes[segment];
        const end = extremes[segment + 1];
        const progress = (time - start.time) / (end.time - start.time);
        curve.push({ time, height: start.height + ((end.height - start.height) * (1 - Math.cos(Math.PI * progress))) / 2 });
    }
    return curve;
}
