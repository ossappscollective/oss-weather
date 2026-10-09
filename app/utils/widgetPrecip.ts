import { precipKind, precipitationFill } from '~/utils/designStyle';

// a precipitation bar of an hour column: horizontal part (0-1), top as a fraction of the height,
// fill color with its probability opacity (#rrggbbaa)
export interface PrecipBar {
    start: number;
    end: number;
    top: number;
    color: string;
}

interface PrecipItem {
    precipProbability?: number;
    precipAccumulation?: number;
    rain?: number;
    snowfall?: number;
    precipShowSnow?: boolean;
    mixedRainSnow?: boolean;
}

// same heights as the app hourly item: square root above 1, half of the height for 25
function barTop(amount: number) {
    const height = amount > 1 ? Math.sqrt(amount) : amount;
    return 0.5 + (1 - height / 5) / 2;
}

function fill(kind: 'rain' | 'snow' | 'mixed', probability: number) {
    const { alpha, color } = precipitationFill('modern', kind, '', probability);
    return color + alpha.toString(16).padStart(2, '0').toUpperCase();
}

// the app hourly item precipitation bars (HourlyItem.svelte), for the widgets hourly chart
export function precipBars(item: PrecipItem): PrecipBar[] {
    const probability = item.precipProbability ?? 0;
    const amount = (item.precipShowSnow ? item.snowfall : item.precipAccumulation) ?? 0;
    if ((probability !== -1 && probability <= 0) || amount <= 0) {
        return [];
    }
    if (item.mixedRainSnow && item.rain >= 0.1 && item.snowfall >= 0.1) {
        return [
            { start: 0, end: 0.5, top: barTop(item.rain), color: fill('rain', probability) },
            { start: 0.5, end: 1, top: barTop(item.snowfall), color: fill('snow', probability) }
        ];
    }
    return [{ start: 0, end: 1, top: barTop(amount), color: fill(precipKind(item), probability) }];
}

// which precipitation texts the app hourly item shows
export function precipTexts(probability: number, accumulation: number, alwaysShow: boolean) {
    const shown = (alwaysShow && (probability > 0 || accumulation >= 0.1)) || ((probability === -1 || probability > 10) && accumulation >= 0.1);
    return { amount: shown && accumulation >= 0.1, probability: shown && probability > 0 };
}
