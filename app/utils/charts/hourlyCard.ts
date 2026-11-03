import { Paint } from '@nativescript-community/ui-canvas';
import type { ImageSource } from '@nativescript/core';
import { formatTime } from '~/helpers/locale';
import type { CommonWeatherData } from '~/services/providers/weather';
import { CommonData, WeatherProps, weatherDataService } from '~/services/weatherData';
import { dataTextStyle, modernDataColor, modernLineStyle, precipitationFill } from '~/utils/design/designStyle';
import { tempColor } from '~/utils/utils.common';
import { isChartedKey } from '~/utils/charts/chartLabels';
import { splitValueUnit } from '~/utils/weather/valueUnit';
import type { HighlightCardContent, HighlightCardRow, HighlightLegendMark } from './chartDraw';

const PRECIPITATION_KEYS: string[] = [WeatherProps.precipAccumulation, WeatherProps.rainPrecipitation, WeatherProps.snowfall];
const fallbackIconPaint = new Paint();

// the data of an hour, as shown by the hourly popover and the chart highlight card
export function hourlyCardData(item: CommonWeatherData, legendKeys: string[] = []): CommonData[] {
    let data = weatherDataService.getAllIconsData({
        item,
        filter: [WeatherProps.windBeaufort, WeatherProps.precipAccumulation],
        addedBefore: [WeatherProps.temperature, WeatherProps.rainPrecipitation, WeatherProps.snowfall],
        addedAfter: [WeatherProps.rainSnowLimit, WeatherProps.iso],
        type: 'hourly'
    });
    // opened from the chart: only the charted data (no uv index, air quality...), and every charted line gets
    // a row, even when its value is usually hidden (low gust...)
    if (legendKeys.length) {
        data = data.filter((entry) => isChartedKey(entry.key, legendKeys));
    }
    const shownKeys = data.map((entry) => entry.key);
    const missingChartKeys = legendKeys.filter((key) => shownKeys.indexOf(key) === -1 && PRECIPITATION_KEYS.indexOf(key) === -1 && key !== WeatherProps.iconId && key !== WeatherProps.windBearing);
    data = data.concat(missingChartKeys.map((key) => weatherDataService.getChartItemData(key as WeatherProps, item, 'hourly')).filter((entry) => !!entry));
    return data;
}

// how the data is drawn in the chart, null for the data not charted
function legendMark(key: string, item: CommonWeatherData, legendKeys: string[], fallbackColor: string): HighlightLegendMark {
    if (PRECIPITATION_KEYS.indexOf(key) !== -1 && PRECIPITATION_KEYS.some((precipitationKey) => legendKeys.indexOf(precipitationKey) !== -1)) {
        const fill = precipitationFill('modern', key === WeatherProps.snowfall ? 'snow' : 'rain', '#378ADD', 100);
        return { kind: 'bar', color: fill.color, alpha: fill.alpha };
    }
    if (legendKeys.indexOf(key) === -1) {
        return null;
    }
    const lineStyle = key === WeatherProps.temperature ? { width: 2.5, dash: undefined } : modernLineStyle(key);
    return {
        kind: 'line',
        width: lineStyle.width,
        dash: lineStyle.dash,
        color: key === WeatherProps.temperature ? tempColor(item.temperature, -20, 30) : (modernDataColor(key) ?? fallbackColor)
    };
}

export function hourlyCardContent(
    item: CommonWeatherData,
    { image, legendKeys = [], style, theme }: { legendKeys?: string[]; image?: ImageSource; style: 'modern' | 'classic'; theme: { onSurface: string; onSurfaceVariant: string } }
): HighlightCardContent {
    const rows: HighlightCardRow[] = hourlyCardData(item, legendKeys).map((data) => {
        const textStyle = dataTextStyle(style, data, theme, 1);
        const { amount, extra, unit } = data.value !== undefined ? splitValueUnit(data.value, data.subvalue) : { amount: '', unit: '', extra: data.subvalue };
        return {
            name: unit,
            color: textStyle.iconColor,
            text: amount,
            extra,
            icon: { glyph: data.icon || ' ', paint: data.paint || fallbackIconPaint, size: data.iconFontSize, color: textStyle.iconColor },
            legend: legendKeys.length ? legendMark(data.key, item, legendKeys, theme.onSurface) : undefined
        };
    });
    return {
        title: formatTime(item.time, 'LT', item.timezoneOffset),
        subtitle: formatTime(item.time, 'ddd D', item.timezoneOffset) + ' · ' + item.description,
        image,
        rows,
        rowHeight: 24
    };
}
