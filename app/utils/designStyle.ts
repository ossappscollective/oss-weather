export type DesignStyle = 'classic' | 'modern';

// keys and values are both rewritten to glyph characters at build time (see app.webpack.config.js)
const MODERN_DATA_ICONS: Record<string, string> = {
    'wi-raindrop': 'wd-raindrop',
    'wi-snowflake-cold': 'wd-snowflake-cold',
    'app-rain-snow': 'wd-rain-snow',
    'wi-cloud': 'wd-cloud',
    'wi-humidity': 'wd-humidity',
    'wi-barometer': 'wd-barometer',
    'wi-windy': 'wd-windy',
    'wi-strong-wind': 'wd-strong-wind',
    'mdi-thermometer': 'wd-thermometer',
    'mdi-thermometer-low': 'wd-thermometer-low',
    'mdi-thermometer-high': 'wd-thermometer-high',
    'mdi-umbrella-outline': 'wd-umbrella-outline',
    'mdi-snowflake': 'wd-snow-depth',
    'mdi-thermometer-water': 'wd-thermometer-water',
    'mdi-snowflake-thermometer': 'wd-snowflake-thermometer',
    'mdi-weather-sunny-alert': 'wd-weather-sunny-alert',
    'mdi-leaf': 'wd-leaf',
    'mdi-theme-light-dark': 'wd-theme-light-dark',
    'mdi-coolant-temperature': 'wd-coolant-temperature',
    'mdi-waves-arrow-up': 'wd-waves-arrow-up',
    'mdi-wave-arrow-up': 'wd-wave-arrow-up',
    'app-wind_0': 'wd-wind_0',
    'app-wind_1': 'wd-wind_1',
    'app-wind_2': 'wd-wind_2',
    'app-wind_3': 'wd-wind_3',
    'app-wind_4': 'wd-wind_4',
    'app-wind_5': 'wd-wind_5',
    'app-wind_6': 'wd-wind_6',
    'app-wind_7': 'wd-wind_7',
    'app-refresh': 'wd-refresh',
    'wi-moon-new': 'wd-moon-new',
    'wi-moon-waxing-crescent-1': 'wd-moon-waxing-crescent-1',
    'wi-moon-waxing-crescent-2': 'wd-moon-waxing-crescent-2',
    'wi-moon-waxing-crescent-3': 'wd-moon-waxing-crescent-3',
    'wi-moon-waxing-crescent-4': 'wd-moon-waxing-crescent-4',
    'wi-moon-waxing-crescent-5': 'wd-moon-waxing-crescent-5',
    'wi-moon-waxing-crescent-6': 'wd-moon-waxing-crescent-6',
    'wi-moon-first-quarter': 'wd-moon-first-quarter',
    'wi-moon-waxing-gibbous-1': 'wd-moon-waxing-gibbous-1',
    'wi-moon-waxing-gibbous-2': 'wd-moon-waxing-gibbous-2',
    'wi-moon-waxing-gibbous-3': 'wd-moon-waxing-gibbous-3',
    'wi-moon-waxing-gibbous-4': 'wd-moon-waxing-gibbous-4',
    'wi-moon-waxing-gibbous-5': 'wd-moon-waxing-gibbous-5',
    'wi-moon-waxing-gibbous-6': 'wd-moon-waxing-gibbous-6',
    'wi-moon-full': 'wd-moon-full',
    'wi-moon-waning-gibbous-1': 'wd-moon-waning-gibbous-1',
    'wi-moon-waning-gibbous-2': 'wd-moon-waning-gibbous-2',
    'wi-moon-waning-gibbous-3': 'wd-moon-waning-gibbous-3',
    'wi-moon-waning-gibbous-4': 'wd-moon-waning-gibbous-4',
    'wi-moon-waning-gibbous-5': 'wd-moon-waning-gibbous-5',
    'wi-moon-waning-gibbous-6': 'wd-moon-waning-gibbous-6',
    'wi-moon-third-quarter': 'wd-moon-third-quarter',
    'wi-moon-waning-crescent-1': 'wd-moon-waning-crescent-1',
    'wi-moon-waning-crescent-2': 'wd-moon-waning-crescent-2',
    'wi-moon-waning-crescent-3': 'wd-moon-waning-crescent-3',
    'wi-moon-waning-crescent-4': 'wd-moon-waning-crescent-4',
    'wi-moon-waning-crescent-5': 'wd-moon-waning-crescent-5',
    'wi-moon-waning-crescent-6': 'wd-moon-waning-crescent-6',
    'wi-wind-beaufort-0': 'wd-wind-beaufort-0',
    'wi-wind-beaufort-1': 'wd-wind-beaufort-1',
    'wi-wind-beaufort-2': 'wd-wind-beaufort-2',
    'wi-wind-beaufort-3': 'wd-wind-beaufort-3',
    'wi-wind-beaufort-4': 'wd-wind-beaufort-4',
    'wi-wind-beaufort-5': 'wd-wind-beaufort-5',
    'wi-wind-beaufort-6': 'wd-wind-beaufort-6',
    'wi-wind-beaufort-7': 'wd-wind-beaufort-7',
    'wi-wind-beaufort-8': 'wd-wind-beaufort-8',
    'wi-wind-beaufort-9': 'wd-wind-beaufort-9',
    'wi-wind-beaufort-10': 'wd-wind-beaufort-10',
    'wi-wind-beaufort-11': 'wd-wind-beaufort-11',
    'wi-wind-beaufort-12': 'wd-wind-beaufort-12'
};

const MODERN_DATA_COLORS: Record<string, string> = {
    precipAccumulation: '#378ADD',
    rain: '#378ADD',
    snowfall: '#00CDE6',
    cloudCover: '#888780',
    uvIndex: '#97C459',
    windSpeed: '#EF9F27',
    windBearing: '#EF9F27',
    windBeaufort: '#EF9F27',
    windGust: '#E24B4A',
    relativeHumidity: '#5DCAA5',
    sealevelPressure: '#7F77DD',
    dewpoint: '#D4537E',
    temperature: '#D85A30',
    apparentTemperature: '#D85A30',
    temperatureMin: '#378ADD',
    temperatureMax: '#D85A30',
    precipProbability: '#378ADD',
    snowDepth: '#00CDE6',
    rainSnowLimit: '#888780',
    iso: '#00CDE6',
    aqi: '#639922',
    moon: '#7F77DD',
    iconId: '#EF9F27',
    seaTemperature: '#378ADD',
    waveHeight: '#185FA5',
    waveHeightMax: '#185FA5',
    swellHeight: '#185FA5'
};

export function styledDataIcon<T extends { fontFamily: string; icon: string }>(style: DesignStyle, data: T): T {
    const modernIcon = style === 'modern' && data?.icon && MODERN_DATA_ICONS[data.icon];
    return modernIcon ? { ...data, fontFamily: 'wd', icon: modernIcon } : data;
}

export function dataTextStyle<C>(
    style: DesignStyle,
    data: { key: string; color?: C; iconColor?: C },
    theme: { onSurface: C; onSurfaceVariant: C },
    fontScale: number
): { iconColor: C | string; valueColor: C; subvalueColor: C; valueFontSize: number; subvalueFontSize: number } {
    if (style === 'modern') {
        return {
            iconColor: data.iconColor || data.color || MODERN_DATA_COLORS[data.key] || theme.onSurface,
            valueColor: theme.onSurface,
            subvalueColor: theme.onSurfaceVariant,
            valueFontSize: 13 * fontScale,
            subvalueFontSize: 11 * fontScale
        };
    }
    const textColor = data.color || theme.onSurface;
    return {
        iconColor: data.iconColor || textColor,
        valueColor: textColor,
        subvalueColor: textColor,
        valueFontSize: 12 * fontScale,
        subvalueFontSize: 9 * fontScale
    };
}

// weights are strings: Android only applies bold for '600'/'700', a numeric 700 renders regular
export function headerTextStyle(style: DesignStyle, fontScale: number, accentWeight: string) {
    const modern = style === 'modern';
    return {
        daySize: (modern ? 18 : 22) * fontScale,
        dayWeight: modern ? accentWeight : 'normal',
        dateSize: (modern ? 12 : 15) * fontScale,
        dateInline: modern,
        minTempSize: (modern ? 15 : 17) * fontScale,
        maxTempSize: (modern ? 17 : 20) * fontScale,
        maxTempWeight: modern ? accentWeight : 'normal'
    };
}

export type PrecipKind = 'rain' | 'snow' | 'mixed';

// same rules as weatherDataIconColors (helpers/formatter.ts), which sets these flags
export function precipKind(item: { precipShowSnow?: boolean; mixedRainSnow?: boolean }): PrecipKind {
    return item.mixedRainSnow ? 'mixed' : item.precipShowSnow ? 'snow' : 'rain';
}

const MODERN_PRECIP_COLORS: Record<PrecipKind, string> = {
    rain: '#378ADD',
    snow: '#00CDE6',
    // half rain, half snow
    mixed: '#1CACE2'
};

export function modernPrecipColor(kind: PrecipKind) {
    return MODERN_PRECIP_COLORS[kind];
}

// probability -1 means the provider gives no probability
export function precipitationFill(style: DesignStyle, kind: PrecipKind, classicColor: string, probability: number) {
    if (style === 'modern') {
        return { color: modernPrecipColor(kind), alpha: Math.round(((probability === -1 ? 50 : probability) * 115) / 100) };
    }
    return { color: classicColor, alpha: probability === -1 ? 125 : Math.round(probability * 2.55) };
}

export function modernDataColor(key: string): string | undefined {
    return MODERN_DATA_COLORS[key];
}

// solid for the main measures, dotted for peaks, dashed for slow trends
const MODERN_LINE_STYLES: Record<string, { width: number; dash?: [number, number] }> = {
    windSpeed: { width: 1.5 },
    uvIndex: { width: 1.5 },
    windGust: { width: 1.5, dash: [2, 4] },
    dewpoint: { width: 1.5, dash: [2, 4] },
    apparentTemperature: { width: 1.5, dash: [2, 4] },
    sealevelPressure: { width: 1.5, dash: [8, 6] },
    relativeHumidity: { width: 1.5, dash: [4, 4] },
    iso: { width: 1.5, dash: [10, 4] },
    rainSnowLimit: { width: 1.5, dash: [10, 4] },
    snowDepth: { width: 2 }
};

export function modernLineStyle(key: string): { width: number; dash?: [number, number] } {
    return MODERN_LINE_STYLES[key] ?? { width: 1.5, dash: [6, 4] };
}

// same thresholds as the hourly chart wind arrows (km/h)
export function windSpeedColor(speed: number, calmColor: string) {
    return speed >= 70 ? '#ff0353' : speed > 40 ? '#FFBC03' : calmColor;
}

// "10:00 PM" -> time "10:00", period "PM", so the period can be drawn smaller
export function splitTimePeriod(formattedTime: string) {
    const match = formattedTime.match(/^([\d:.]+)\s*(\D+)$/);
    return match ? { time: match[1], period: match[2].trim() } : { time: formattedTime, period: '' };
}

// opacity (0-255) of the text color tint behind cards and chips
export function cardBackgroundAlpha(darkTheme: boolean) {
    return darkTheme ? 14 : 6;
}

export interface TintSource {
    precipAccumulation?: number;
    rain?: number;
    snowfall?: number;
    precipProbability?: number;
    precipShowSnow?: boolean;
    mixedRainSnow?: boolean;
    cloudCover?: number;
    uvIndex?: number;
    uvIndexColor?: unknown;
}

// precipitation amount (mm, or cm of snow) tinting its chip fully
const TINT_FULL_PRECIPITATION = 10;
const TINT_FULL_UV = 11;

function precipitationTint(amount: number, probability: number, color: string) {
    // square root: light rain is already visible, heavy rain saturates
    const fraction = Math.min(1, Math.sqrt(amount / TINT_FULL_PRECIPITATION)) * (probability > 0 ? probability / 100 : 1);
    return { color, fraction };
}

// how strongly a data shows (0-1) and its color: lets wet, cloudy or high UV days stand out
export function dataTint(key: string, item: TintSource): { color: string; fraction: number } | undefined {
    let tint: { color: string; fraction: number };
    switch (key) {
        case 'precipAccumulation':
            tint = precipitationTint(item.precipAccumulation, item.precipProbability, modernPrecipColor(precipKind(item)));
            break;
        case 'rain':
            tint = precipitationTint(item.rain, item.precipProbability, modernPrecipColor('rain'));
            break;
        case 'snowfall':
            tint = precipitationTint(item.snowfall, item.precipProbability, modernPrecipColor('snow'));
            break;
        case 'cloudCover':
            tint = { color: MODERN_DATA_COLORS.cloudCover, fraction: Math.min(1, item.cloudCover / 100) };
            break;
        case 'uvIndex':
            tint = { color: typeof item.uvIndexColor === 'string' ? item.uvIndexColor : MODERN_DATA_COLORS.uvIndex, fraction: Math.min(1, item.uvIndex / TINT_FULL_UV) };
            break;
        default:
            return undefined;
    }
    return tint.fraction > 0 ? tint : undefined;
}

export function tintAlpha(fraction: number, darkTheme: boolean) {
    const base = cardBackgroundAlpha(darkTheme);
    return Math.round(base + fraction * ((darkTheme ? 110 : 80) - base));
}
