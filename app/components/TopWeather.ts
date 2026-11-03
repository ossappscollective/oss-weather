export type MinutelySummary = { kind: 'none' | 'all' | 'intermittent' } | { kind: 'starting' | 'stopping'; minutes: number };

// one line describing the precipitation of the coming minutes
export function minutelySummary(entries: { time: number; intensity: number }[], now: number): MinutelySummary {
    const wet = entries.map((entry) => entry.intensity > 0);
    if (!wet.some((value) => value)) {
        return { kind: 'none' };
    }
    if (wet.every((value) => value)) {
        return { kind: 'all' };
    }
    const changeIndex = wet.findIndex((value) => value !== wet[0]);
    if (wet.slice(changeIndex).some((value) => value === wet[0])) {
        return { kind: 'intermittent' };
    }
    return { kind: wet[0] ? 'stopping' : 'starting', minutes: Math.max(0, Math.round((entries[changeIndex].time - now) / 60000)) };
}

// same thresholds as the chart levels: 1 light, 2 medium, 3 heavy
export function minutelyIntensity(entries: { intensity: number }[]): 'light' | 'medium' | 'heavy' | undefined {
    const max = Math.max(0, ...entries.map((entry) => entry.intensity));
    if (max <= 0) {
        return undefined;
    }
    return max > 2 ? 'heavy' : max > 1 ? 'medium' : 'light';
}

export function minutelyAxisLabel(minutes: number, isLast: boolean, nowText: string) {
    if (minutes <= 0) {
        return nowText;
    }
    return isLast ? `${minutes} min` : `${minutes}`;
}

// labels for a chart spanning [0, totalMinutes]: the edge ones stay inside the chart
export function minutelyAxisTicks(totalMinutes: number): { minutes: number; fraction: number; align: 'left' | 'center' | 'right' }[] {
    if (totalMinutes <= 0) {
        return [];
    }
    const step = totalMinutes > 90 ? 30 : 15;
    const ticks: { minutes: number; fraction: number; align: 'left' | 'center' | 'right' }[] = [];
    for (let minutes = 0; minutes <= totalMinutes; minutes += step) {
        ticks.push({ minutes, fraction: minutes / totalMinutes, align: 'center' });
    }
    ticks[0].align = 'left';
    if (ticks.length > 1 && ticks[ticks.length - 1].fraction > 0.9) {
        ticks[ticks.length - 1].align = 'right';
    }
    return ticks;
}
