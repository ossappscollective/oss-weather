import { tintAlpha } from '~/utils/designStyle';

export interface WidgetChip {
    // the data icon, drawn by the app in its color
    iconPath: string;
    value: string;
    unit: string;
    // intensity tint of the chip background (translucent hex), empty when none
    tint: string;
    // precipitation probability as a bar under the value (0-1), in the data color
    barFraction: number;
    barColor: string;
}

// what widgets need of a weather data item (weatherDataService getIconsData)
interface ChipSource {
    value?: string | number;
    subvalue?: string;
    probability?: number;
    color?: string;
    tint?: { color: string; fraction: number };
}

// a data chip of the app turned into plain widget values (widgets render on their own, without the app theme)
export function widgetChip(data: ChipSource, iconPath: string, intensity: boolean): WidgetChip {
    // widgets have no theme at data time: the light alpha also reads on dark backgrounds
    const alpha = intensity && data.tint ? tintAlpha(data.tint.fraction, false) : 0;
    const hasBar = data.probability > 0;
    return {
        iconPath,
        value: data.value === undefined || data.value === null ? '' : data.value + '',
        // with a probability the subvalue is that probability: drawn as the bar
        unit: hasBar ? '' : (data.subvalue ?? ''),
        tint: alpha ? data.tint.color + alpha.toString(16).padStart(2, '0').toUpperCase() : '',
        barFraction: hasBar ? data.probability / 100 : 0,
        barColor: hasBar && data.color ? data.color : ''
    };
}
