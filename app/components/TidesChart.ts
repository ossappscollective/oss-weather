import type { Tide } from '~/services/providers/weather';

// the x values of the tide chart are 10 minutes since the start of the day, like the astronomy chart
export const MINUTES_PER_X = 10;
export const DAY_X = (24 * 60) / MINUTES_PER_X;
const HOUR = 3600 * 1000;

export interface TidePoint {
    x: number;
    y: number;
}

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

export function tideX(tide: Tide, dayStart: number) {
    return (tide.time - dayStart) / (MINUTES_PER_X * 60000);
}

// what the chart shows for the tides of the day starting at `dayStart`: the curve (the tides themselves when there is no
// curve), a point per tide, and the heights of the axis. The sea level (0) stays in the chart, with room for the value labels
export function tideChartData(tides: Tide[], dayStart: number) {
    const points: TidePoint[] = tides.map((tide) => ({ x: tideX(tide, dayStart), y: tide.height }));
    const curve: TidePoint[] = tideCurve(tides, dayStart, dayStart + 24 * HOUR, MINUTES_PER_X * 60000).map((point) => ({ x: (point.time - dayStart) / (MINUTES_PER_X * 60000), y: point.height }));
    const heights = tides.map((tide) => tide.height);
    const highest = Math.max(...heights, 0);
    const lowest = Math.min(...heights, 0);
    const margin = Math.max(0.4, (highest - lowest) * 0.25);
    return { line: curve.length ? curve : points, points, axisMinimum: lowest - margin, axisMaximum: highest + margin };
}

// the tide at the touched x, within 15 minutes
export function tideAtX(tides: Tide[], dayStart: number, x: number) {
    return tides.find((tide) => Math.abs(tideX(tide, dayStart) - x) <= 1.5);
}

// a label centered on its tide, against the edge of the chart when it would go out of it (a tide at the start or the end of the day)
export function labelPlacement(pointX: number, halfWidth: number, left: number, right: number, inset = 2): { x: number; align: 'left' | 'center' | 'right' } {
    if (pointX - halfWidth < left) {
        return { x: left + inset, align: 'left' };
    }
    if (pointX + halfWidth > right) {
        return { x: right - inset, align: 'right' };
    }
    return { x: pointX, align: 'center' };
}
