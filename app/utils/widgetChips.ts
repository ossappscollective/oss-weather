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

// widgets have no flow layout: chips fill rows in order while they fit, the others are not shown
// (same packing in WidgetModern.kt and ModernComponents.swift)
export function packChips(widths: number[], maxWidth: number, spacing: number, maxRows: number): number[][] {
    const rows: number[][] = [];
    let rowWidth = 0;
    for (let index = 0; index < widths.length; index++) {
        const current = rows[rows.length - 1];
        if (current && rowWidth + spacing + widths[index] <= maxWidth) {
            current.push(index);
            rowWidth += spacing + widths[index];
        } else if (rows.length < maxRows && widths[index] <= maxWidth) {
            rows.push([index]);
            rowWidth = widths[index];
        } else {
            break;
        }
    }
    return rows;
}
