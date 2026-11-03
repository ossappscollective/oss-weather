import { writable } from 'svelte/store';

// a list holding charts scrolled: the charts drop their highlight
export const chartScrolled = writable(0);
export function notifyChartScrolled() {
    chartScrolled.update((count) => count + 1);
}
