import { lc, lt } from '@nativescript-community/l';
import { createNativeAttributedString } from '@nativescript-community/text';
import { Align, Canvas, Cap, LayoutAlignment, Paint, StaticLayout, Style } from '@nativescript-community/ui-canvas';
import { HorizontalPosition, VerticalPosition } from '@nativescript-community/ui-popover';
import { PopoverOptions, showPopover } from '@nativescript-community/ui-popover/svelte';
import { ApplicationSettings, Color, Observable } from '@nativescript/core';
import { ComponentProps } from 'svelte';
import { get } from 'svelte/store';
import type HourlyPopover__SvelteComponent_ from '~/components/HourlyPopover.svelte';
import { MIN_UV_INDEX, SETTINGS_MIN_UV_INDEX } from '~/helpers/constants';
import { convertValueToUnit, formatValueToUnit } from '~/helpers/formatter';
import { UNITS, UNIT_FAMILIES } from '~/helpers/units';
import type { CommonWeatherData, WeatherData } from '~/services/providers/weather';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { getIndexedColor, tempColor } from '~/utils/utils';
import { cloudyColor, fontScale, fonts, rainColor, scatteredCloudyColor, snowColor, sunnyColor, unitsSettings } from '~/variables';
import { colorForAqi } from './airQualityData';
import { iconService } from './icon';
import { prefs } from './preferences';
import { isEInk } from '~/helpers/theme';

export enum WeatherProps {
    precipAccumulation = 'precipAccumulation',
    rainPrecipitation = 'rain',
    precipProbability = 'precipProbability',
    cloudCover = 'cloudCover',
    cloudCeiling = 'cloudCeiling',
    uvIndex = 'uvIndex',
    windGust = 'windGust',
    moon = 'moon',
    windBeaufort = 'windBeaufort',
    temperature = 'temperature',
    temperatureMin = 'temperatureMin',
    temperatureMax = 'temperatureMax',
    snowDepth = 'snowDepth',
    snowfall = 'snowfall',
    iso = 'iso',
    iconId = 'iconId',
    windSpeed = 'windSpeed',
    windBearing = 'windBearing',
    rainSnowLimit = 'rainSnowLimit',
    aqi = 'aqi',
    sealevelPressure = 'sealevelPressure',
    apparentTemperature = 'apparentTemperature',
    relativeHumidity = 'relativeHumidity',
    dewpoint = 'dewpoint',
    seaTemperature = 'seaTemperature',
    waveHeight = 'waveHeight',
    waveHeightMax = 'waveHeightMax',
    swellHeight = 'swellHeight'
}

export function propToUnit(prop: WeatherProps, item?: CommonWeatherData, options?: { canForcePrecipUnit?: boolean }) {
    switch (prop) {
        case WeatherProps.windSpeed:
        case WeatherProps.windGust:
            return unitsSettings[UNIT_FAMILIES.Speed];
        case WeatherProps.temperature:
        case WeatherProps.apparentTemperature:
        case WeatherProps.temperatureMax:
        case WeatherProps.temperatureMin:
        case WeatherProps.dewpoint:
        case WeatherProps.seaTemperature:
            return unitsSettings[UNIT_FAMILIES.Temperature];
        case WeatherProps.sealevelPressure:
            return unitsSettings[UNIT_FAMILIES.Pressure];
        case WeatherProps.iso:
        case WeatherProps.cloudCeiling:
        case WeatherProps.rainSnowLimit:
        case WeatherProps.waveHeight:
        case WeatherProps.waveHeightMax:
        case WeatherProps.swellHeight:
            return unitsSettings[UNIT_FAMILIES.Distance];
        case WeatherProps.cloudCover:
        case WeatherProps.precipProbability:
        case WeatherProps.relativeHumidity:
            return unitsSettings[UNIT_FAMILIES.Percent];
        case WeatherProps.precipProbability:
        case WeatherProps.uvIndex:
            return unitsSettings[UNIT_FAMILIES.Uv];
        case WeatherProps.rainPrecipitation:
            return unitsSettings[UNIT_FAMILIES.Precipitation];
        case WeatherProps.precipAccumulation:
            if (item?.precipUnitFamily && options?.canForcePrecipUnit !== false) {
                return unitsSettings[item?.precipUnitFamily];
            }
            return unitsSettings[UNIT_FAMILIES.Precipitation];
        case WeatherProps.snowfall:
        case WeatherProps.snowDepth:
            return unitsSettings[UNIT_FAMILIES.DistanceSmall];
        default:
            break;
    }
}
export function defaultPropUnit(prop: WeatherProps) {
    switch (prop) {
        case WeatherProps.windSpeed:
        case WeatherProps.windGust:
            return UNITS.SpeedKm;
        case WeatherProps.temperature:
        case WeatherProps.apparentTemperature:
        case WeatherProps.temperatureMax:
        case WeatherProps.temperatureMin:
        case WeatherProps.dewpoint:
        case WeatherProps.seaTemperature:
            return UNITS.Celcius;
        case WeatherProps.sealevelPressure:
            return UNITS.PressureHpa;
        case WeatherProps.iso:
        case WeatherProps.cloudCeiling:
        case WeatherProps.waveHeight:
        case WeatherProps.waveHeightMax:
        case WeatherProps.swellHeight:
            return UNITS.Meters;
        case WeatherProps.cloudCover:
        case WeatherProps.precipProbability:
        case WeatherProps.relativeHumidity:
            return UNITS.Percent;
        case WeatherProps.precipProbability:
        case WeatherProps.uvIndex:
            return UNITS.UV;
        case WeatherProps.precipAccumulation:
        case WeatherProps.rainPrecipitation:
            return UNITS.MM;
        case WeatherProps.snowfall:
        case WeatherProps.snowDepth:
            return UNITS.CM;
        default:
            break;
    }
}

const UV_LEVEL_INDEXES = [0, 3, 6, 8, 11];
const UV_LEVEL_COLORS = ['#9BC600', '#FFBC03', '#FE8F00', '#F55023', '#9E47CC'];

export const DEFAULT_COMMON_WEATHER_DATA = '["windSpeed", "precipAccumulation", "cloudCover", "uvIndex", "windGust", "windBeaufort", "moon"]';

const arcPaint = new Paint();
arcPaint.style = Style.STROKE;
arcPaint.setTextAlign(Align.CENTER);
arcPaint.strokeCap = Cap.ROUND;

export const AVAILABLE_WEATHER_DATA = [
    WeatherProps.windSpeed,
    WeatherProps.precipAccumulation,
    WeatherProps.cloudCover,
    WeatherProps.uvIndex,
    WeatherProps.windGust,
    WeatherProps.moon,
    WeatherProps.snowDepth,
    WeatherProps.windBeaufort,
    WeatherProps.aqi,
    WeatherProps.apparentTemperature,
    WeatherProps.sealevelPressure,
    WeatherProps.relativeHumidity,
    WeatherProps.dewpoint,
    WeatherProps.iso,
    WeatherProps.rainSnowLimit,
    WeatherProps.seaTemperature,
    WeatherProps.waveHeight,
    WeatherProps.waveHeightMax,
    WeatherProps.swellHeight
];
export const AVAILABLE_WEATHER_DATA_MAIN_HOURLY = [
    WeatherProps.iconId,
    WeatherProps.windSpeed,
    WeatherProps.windBearing,
    WeatherProps.precipAccumulation,
    WeatherProps.cloudCover,
    WeatherProps.windGust
];
export const AVAILABLE_COMPARE_WEATHER_DATA = [
    WeatherProps.precipProbability,
    WeatherProps.windBearing,
    WeatherProps.windSpeed,
    WeatherProps.precipAccumulation,
    WeatherProps.rainPrecipitation,
    WeatherProps.cloudCover,
    WeatherProps.uvIndex,
    WeatherProps.windGust,
    WeatherProps.temperature,
    WeatherProps.apparentTemperature,
    WeatherProps.temperatureMin,
    WeatherProps.temperatureMax,
    WeatherProps.snowDepth,
    WeatherProps.snowfall,
    WeatherProps.iconId,
    WeatherProps.iso,
    WeatherProps.rainSnowLimit
];

export const onWeatherDataChanged = createGlobalEventListener('weatherData');

export const wiPaint = new Paint();
wiPaint.setTextAlign(Align.CENTER);
export const mdiPaint = new Paint();
mdiPaint.setTextAlign(Align.CENTER);
export const appPaint = new Paint();
appPaint.setTextAlign(Align.CENTER);

fonts.subscribe((data) => {
    if (data.wi?.length) {
        wiPaint.setFontFamily(data.wi);
        mdiPaint.setFontFamily(data.mdi);
        appPaint.setFontFamily(data.app);
    }
});

const WEATHER_DATA_PARENT = {
    [WeatherProps.snowfall]: WeatherProps.precipAccumulation,
    [WeatherProps.rainPrecipitation]: WeatherProps.precipAccumulation
};

const WEATHER_DATA_ICONS = {
    [WeatherProps.moon]: (item: CommonWeatherData) => item.moonIcon,
    [WeatherProps.iconId]: 'mdi-theme-light-dark',
    [WeatherProps.sealevelPressure]: 'wi-barometer',
    [WeatherProps.relativeHumidity]: 'wi-humidity',
    [WeatherProps.dewpoint]: 'mdi-thermometer-water',
    [WeatherProps.apparentTemperature]: 'mdi-thermometer',
    [WeatherProps.temperature]: 'mdi-thermometer',
    [WeatherProps.rainSnowLimit]: 'app-rain-snow',
    [WeatherProps.iso]: 'mdi-snowflake-thermometer',
    [WeatherProps.cloudCover]: 'wi-cloud',
    [WeatherProps.windGust]: 'wi-strong-wind',
    [WeatherProps.uvIndex]: 'mdi-weather-sunny-alert',
    [WeatherProps.windBeaufort]: (item: CommonWeatherData) => item.windBeaufortIcon,
    [WeatherProps.windSpeed]: (item: CommonWeatherData) => item.windIcon,
    [WeatherProps.precipAccumulation]: (item: CommonWeatherData) => item.precipIcon,
    [WeatherProps.rainPrecipitation]: 'wi-raindrop',
    [WeatherProps.snowfall]: 'wi-snowflake-cold',
    [WeatherProps.seaTemperature]: 'mdi-coolant-temperature',
    [WeatherProps.waveHeight]: 'mdi-waves-arrow-up',
    [WeatherProps.waveHeightMax]: 'mdi-waves-arrow-up',
    [WeatherProps.swellHeight]: 'mdi-wave-arrow-up'
};
const WEATHER_DATA_SHORT_TITLES = {
    [WeatherProps.snowfall]: lt('snow'),
    [WeatherProps.rainPrecipitation]: lt('rain')
};
const WEATHER_DATA_TITLES = {
    [WeatherProps.iconId]: lt('weather_condition'),
    [WeatherProps.moon]: lt('moon'),
    [WeatherProps.cloudCover]: lt('cloud_cover'),
    [WeatherProps.windGust]: lt('wind_gust'),
    [WeatherProps.uvIndex]: lt('uv_index'),
    [WeatherProps.windBeaufort]: lt('wind_beaufort'),
    [WeatherProps.windSpeed]: lt('wind_speed'),
    [WeatherProps.rainSnowLimit]: lt('rain_snow_limit'),
    [WeatherProps.iso]: lt('freezing_level'),
    [WeatherProps.precipAccumulation]: lt('precipitation'),
    [WeatherProps.precipProbability]: lt('precipitation_probability'),
    [WeatherProps.snowfall]: lt('snow_precipitation'),
    [WeatherProps.apparentTemperature]: lt('feels_like'),
    [WeatherProps.aqi]: lt('aqi'),
    [WeatherProps.sealevelPressure]: lt('sealevel_pressure'),
    [WeatherProps.dewpoint]: lt('dewpoint'),
    [WeatherProps.relativeHumidity]: lt('relative_humidity'),
    [WeatherProps.snowDepth]: lt('snow_depth'),
    [WeatherProps.temperature]: lt('temperature'),
    [WeatherProps.temperatureMin]: lt('min_temperature'),
    [WeatherProps.temperatureMax]: lt('max_temperature'),
    [WeatherProps.rainPrecipitation]: lt('rain_precipitation'),
    [WeatherProps.windBearing]: lt('wind_bearing'),
    [WeatherProps.seaTemperature]: lt('sea_temperature'),
    [WeatherProps.waveHeight]: lt('wave_height'),
    [WeatherProps.waveHeightMax]: lt('wave_height_max'),
    [WeatherProps.swellHeight]: lt('swell_height')
};
const WEATHER_DATA_COLORS = {
    [WeatherProps.moon]: '#845987',
    [WeatherProps.dewpoint]: '#0cafeb',
    [WeatherProps.relativeHumidity]: '#1e88e2',
    // [WeatherProps.apparentTemperature]: cloudyColor,
    [WeatherProps.cloudCover]: cloudyColor,
    [WeatherProps.windGust]: scatteredCloudyColor,
    [WeatherProps.windBeaufort]: scatteredCloudyColor,
    [WeatherProps.windSpeed]: scatteredCloudyColor,
    [WeatherProps.windBearing]: scatteredCloudyColor,
    // [WeatherProps.uvIndex]: scatteredCloudyColor,
    [WeatherProps.rainSnowLimit]: rainColor,
    [WeatherProps.iso]: snowColor,
    [WeatherProps.iconId]: sunnyColor,
    [WeatherProps.precipAccumulation]: rainColor,
    [WeatherProps.rainPrecipitation]: rainColor,
    [WeatherProps.snowfall]: snowColor,
    [WeatherProps.aqi]: colorForAqi(0),
    [WeatherProps.seaTemperature]: '#0288d1',
    [WeatherProps.waveHeight]: '#0288d1',
    [WeatherProps.waveHeightMax]: '#0277bd',
    [WeatherProps.swellHeight]: '#01579b'
};

export function getWeatherDataIcon(key: string) {
    let icon = WEATHER_DATA_ICONS[key];
    if (typeof icon === 'function') {
        icon = icon({ [key]: 0 });
    }
    return icon;
}
export function getWeatherDataTitle(key: string) {
    return WEATHER_DATA_TITLES[key] || key;
}
export function getWeatherDataShortTitle(key: string) {
    return WEATHER_DATA_SHORT_TITLES[key] || WEATHER_DATA_TITLES[key] || key;
}
export function getWeatherDataColor(key: string) {
    return WEATHER_DATA_COLORS[key];
}
const ICONS_SIZE_FACTOR = {
    [WeatherProps.sealevelPressure]: 0.9,
    [WeatherProps.windSpeed]: 0.8,
    [WeatherProps.uvIndex]: 1,
    [WeatherProps.cloudCover]: 0.9,
    [WeatherProps.windGust]: 0.8,
    [WeatherProps.relativeHumidity]: 0.8,
    [WeatherProps.iso]: 0.9,
    [WeatherProps.rainSnowLimit]: 0.8
};

export interface CommonData {
    key: string;
    iconColor?: string | Color;
    color?: string | Color;
    textColor?: string | Color;
    backgroundColor?: string | Color;
    customDrawColor?: string | Color;
    paint?: Paint;
    iconFontSize?: number;
    icon?: string;
    value?: string | number;
    subvalue?: string;
    customDraw?(canvas: Canvas, fontScale: number, paint: Paint, c: CommonData, x: number, y: number, ...args);
}
export interface CommonDataOptions {
    id: string;
    icon: string | ((item: CommonWeatherData) => string);
    iconFactor: number;
    // getData: (options: CommonDataOptions, item: CommonWeatherData) => any;
}

export function mergeWeatherData(mainData: WeatherData, ...addedDatas) {
    for (let index = 0; index < addedDatas.length; index++) {
        const addedData = addedDatas[index];
        Object.keys(addedData).forEach((k) => {
            const mainDataK: CommonWeatherData[] = mainData[k]?.data || mainData[k];
            const addedDataK: CommonWeatherData[] = addedData[k]?.data || addedData[k];
            if (!Array.isArray(mainDataK) && !Array.isArray(addedDataK)) {
                // DEV_LOG && console.log('mergeWeatherData object', k);
                Object.assign(mainDataK, addedDataK);
                return;
            }
            if (!mainDataK?.length || !addedDataK?.length) {
                return;
            }
            for (index = 0; index < mainDataK.length; index++) {
                const time = mainDataK[index].time;
                const foundIndexToMerge = addedDataK.findIndex((d) => d.time === time);

                if (foundIndexToMerge >= 0) {
                    Object.assign(mainDataK[index], addedDataK[foundIndexToMerge]);
                }
            }
        });
    }
}

export class DataService extends Observable {
    minUVIndexToShow = MIN_UV_INDEX;
    constructor() {
        super();
        this.load();

        const setminUVIndexToShow = () => {
            this.minUVIndexToShow = ApplicationSettings.getNumber(SETTINGS_MIN_UV_INDEX, MIN_UV_INDEX);
        };
        setminUVIndexToShow();
        // prefs.on('key:common_data', this.load, this);
        prefs.on(`key:${SETTINGS_MIN_UV_INDEX}`, setminUVIndexToShow);
    }
    currentWeatherData: WeatherProps[] = [];
    currentSmallWeatherData: WeatherProps[] = [];
    allWeatherData: WeatherProps[] = [];

    getWeatherDataOptions(key: WeatherProps) {
        return {
            id: key,
            icon: WEATHER_DATA_ICONS[key],
            iconFactor: ICONS_SIZE_FACTOR[key] ?? 1
            // getData: this.getItemData
        };
    }
    updateCurrentWeatherData(data: WeatherProps[], smallData: WeatherProps[], save = true) {
        this.currentWeatherData = data;
        this.currentSmallWeatherData = smallData;
        this.allWeatherData = data.concat(smallData);
        // this.currentWeatherDataOptions = data.reduce((acc, key) => {
        //     acc[key] = {
        //         id: key,
        //         icon: WEATHER_DATA_ICONS[key],
        //         iconFactor: ICONS_SIZE_FACTOR[key] ?? 1
        //         // getData: this.getItemData
        //     };
        //     return acc;
        // }, {});
        if (save) {
            ApplicationSettings.setString('common_data', JSON.stringify(data));
            ApplicationSettings.setString('common_small_data', JSON.stringify(smallData));
            globalObservable.notify({ eventName: 'weatherData', data, smallData });
        }
    }
    load() {
        this.updateCurrentWeatherData(
            JSON.parse(ApplicationSettings.getString('common_data', '["windSpeed", "precipAccumulation", "cloudCover", "uvIndex", "windGust", "windBeaufort", "moon"]')),
            JSON.parse(ApplicationSettings.getString('common_small_data', '[]')),
            false
        );
    }
    isDataEnabled(key) {
        return this.allWeatherData.indexOf(key) !== -1;
    }

    getAllIconsData({
        addedAfter = [],
        addedBefore = [],
        filter = [],
        item,
        type
    }: {
        item: CommonWeatherData;
        filter?: WeatherProps[];
        addedBefore?: WeatherProps[];
        addedAfter?: WeatherProps[];
        type?: 'daily' | 'hourly' | 'currently';
    }) {
        let keys = [...new Set(addedBefore.concat(this.allWeatherData).concat(addedAfter))];
        if (filter.length) {
            keys = keys.filter((k) => filter.indexOf(k) === -1);
        }
        return keys.map((k) => this.getItemData(k, item, type)).filter((d) => !!d);
    }
    getIconsData({
        addedAfter = [],
        addedBefore = [],
        filter = [],
        item,
        type
    }: {
        item: CommonWeatherData;
        filter?: WeatherProps[];
        addedBefore?: WeatherProps[];
        addedAfter?: WeatherProps[];
        type?: 'daily' | 'hourly' | 'currently';
    }) {
        let keys = [...new Set(addedBefore.concat(this.currentWeatherData).concat(addedAfter))];
        if (filter.length) {
            keys = keys.filter((k) => filter.indexOf(k) === -1);
        }
        return keys.map((k) => this.getItemData(k, item, type)).filter((d) => !!d);
    }
    getSmallIconsData({
        addedAfter = [],
        addedBefore = [],
        filter = [],
        item,
        type
    }: {
        item: CommonWeatherData;
        filter?: WeatherProps[];
        addedBefore?: WeatherProps[];
        addedAfter?: WeatherProps[];
        type?: 'daily' | 'hourly' | 'currently';
    }) {
        let keys = [...new Set(addedBefore.concat(this.currentSmallWeatherData).concat(addedAfter))];
        if (filter.length) {
            keys = keys.filter((k) => filter.indexOf(k) === -1);
        }
        return keys.map((k) => this.getItemData(k, item, type)).filter((d) => !!d);
    }

    getItemData(key: WeatherProps, item: CommonWeatherData, type?: 'daily' | 'hourly' | 'currently', options?): CommonData {
        const dataOptions = this.getWeatherDataOptions(key);
        if (!dataOptions || (key !== WeatherProps.temperature && this.allWeatherData.indexOf(WEATHER_DATA_PARENT[key] || key) === -1)) {
            return null;
        }
        const toCheck = (type === 'daily' && key === WeatherProps.apparentTemperature ? item['apparentTemperatureMin'] : item[key]) ?? null;
        if (toCheck === null) {
            return null;
        }
        let icon: string = dataOptions.icon as any;
        if (typeof icon === 'function') {
            icon = (icon as Function)(item);
        }
        const iconFontSize = 20 * get(fontScale) * dataOptions.iconFactor;
        switch (key) {
            case WeatherProps.apparentTemperature:
                if (type === 'daily') {
                    if (item.apparentTemperatureMin) {
                        return {
                            key,
                            iconFontSize,
                            paint: mdiPaint,
                            icon,
                            value:
                                formatValueToUnit(item.apparentTemperatureMin, propToUnit(key, item), defaultPropUnit(key)) +
                                '/' +
                                formatValueToUnit(item.apparentTemperatureMax, propToUnit(key, item), defaultPropUnit(key)),
                            subvalue: lc('apparent')
                        };
                    }
                } else if (item.apparentTemperature) {
                    return {
                        key,
                        iconFontSize,
                        paint: mdiPaint,
                        icon,
                        value: formatWeatherValue(item, key, options),
                        subvalue: lc('apparent')
                    };
                }

                break;
            case WeatherProps.temperature:
                if (type === 'daily') {
                    if (item.temperatureMin) {
                        return {
                            key,
                            iconFontSize,
                            paint: mdiPaint,
                            icon,
                            value:
                                formatValueToUnit(item.temperatureMin, propToUnit(key, item), defaultPropUnit(key)) +
                                '/' +
                                formatValueToUnit(item.temperatureMax, propToUnit(key, item), defaultPropUnit(key))
                        };
                    }
                } else if (item.temperature) {
                    return {
                        key,
                        // iconColor: tempColor(item[key], -20, 30),
                        iconFontSize,
                        paint: mdiPaint,
                        icon,
                        value: formatWeatherValue(item, key, options)
                    };
                }

                break;
            case WeatherProps.windSpeed:
                if (item.windSpeed) {
                    const data = convertWeatherValueToUnit(item, key, options);
                    return {
                        key,
                        iconFontSize,
                        paint: appPaint,
                        icon,
                        value: data[0],
                        subvalue: data[1]
                    };
                }
                break;
            // case WeatherProps.temperature:
            //     // const data = convertWeatherValueToUnit(item, key);
            //     return {
            //         key,
            //         iconFontSize,
            //         iconColor: tempColor(item[key], -20, 30),
            //         paint: mdiPaint,
            //         icon,
            //         value: formatWeatherValue(item, key, options)
            //         // subvalue: data[1]
            //     };
            case WeatherProps.rainSnowLimit: {
                const data = convertWeatherValueToUnit(item, key, options);
                return {
                    key,
                    iconFontSize,
                    iconColor: getWeatherDataColor(key),
                    paint: appPaint,
                    icon,
                    value: data[0],
                    subvalue: data[1]
                };
            }
            case WeatherProps.iso: {
                const data = convertWeatherValueToUnit(item, key, options);
                return {
                    key,
                    iconFontSize,
                    iconColor: getWeatherDataColor(key),
                    paint: mdiPaint,
                    icon,
                    value: data[0],
                    subvalue: data[1]
                };
            }
            case WeatherProps.aqi:
                if (item.aqi) {
                    return {
                        key,
                        iconFontSize,
                        paint: mdiPaint,
                        color: item.aqiColor,
                        icon: 'mdi-leaf',
                        value: item.aqi,
                        subvalue: 'aqi'
                        // customDraw(canvas, fontScale, textPaint, item: CommonData, x, y, width) {
                        //     const size = (width * 2) / 3;
                        //     const arcY = y - size / 5;
                        //     const STROKE_WIDTH = 4 * fontScale;
                        //     const arcRect = new RectF(x - size / 2, arcY - size / 2, x + size / 2, arcY + size / 2);
                        //     const delta = 180 - 45 + STROKE_WIDTH / 2;
                        //     arcPaint.setStrokeWidth(STROKE_WIDTH);
                        //     arcPaint.color = new Color(colorForAqi(item.value));
                        //     arcPaint.setAlpha(100);
                        //     canvas.drawArc(arcRect, 0 + delta, 270 - STROKE_WIDTH, false, arcPaint);
                        //     arcPaint.setAlpha(255);
                        //     canvas.drawArc(arcRect, 0 + delta, ((item.value as number) / 400) * (270 - STROKE_WIDTH), false, arcPaint);

                        //     // textPaint.setColor(colorForAqi(item.aqi));
                        //     textPaint.setTextSize(14 * fontScale);
                        //     canvas.drawText(item.value + '', x, arcY + (size * 1) / 5, textPaint);

                        //     textPaint.setTextSize(12 * fontScale);
                        //     // textPaint.setColor(item.color || colorOnSurface);
                        //     canvas.drawText(item.subvalue + '', x, y + 19 * fontScale, textPaint);
                        // }
                    };
                }
                break;
            case WeatherProps.precipAccumulation:
                if ((item.precipProbability === -1 || item.precipProbability === undefined || item.precipProbability > 10) && item.precipAccumulation >= 0.1) {
                    return {
                        key,
                        paint: item.precipFontUseApp ? appPaint : wiPaint,
                        color: item.precipColor,
                        iconFontSize,
                        icon: item.precipIcon,
                        value: formatWeatherValue(item, key, options),
                        subvalue: item.precipProbability > 0 && formatWeatherValue(item, WeatherProps.precipProbability, options)
                    };
                }
                break;
            case WeatherProps.rainPrecipitation:
            case WeatherProps.snowfall:
                if ((item.precipProbability === -1 || item.precipProbability === undefined || item.precipProbability > 10) && item[key] >= 0.1) {
                    return {
                        key,
                        paint: wiPaint,
                        iconColor: getWeatherDataColor(key),
                        iconFontSize,
                        icon,
                        value: formatWeatherValue(item, key, options),
                        subvalue: item.precipProbability > 0 && formatWeatherValue(item, WeatherProps.precipProbability, options)
                    };
                }
                break;

            case WeatherProps.cloudCover:
                if (item.cloudCover > 20) {
                    return {
                        key,
                        paint: wiPaint,
                        color: item.cloudColor,
                        iconFontSize,
                        icon,
                        value: formatWeatherValue(item, key),
                        subvalue: item.cloudCeiling && formatWeatherValue(item, WeatherProps.cloudCeiling)
                    };
                }
                break;
            case WeatherProps.uvIndex:
                if (item.uvIndex >= this.minUVIndexToShow) {
                    return {
                        key,
                        paint: mdiPaint,
                        color: item.uvIndexColor,
                        iconFontSize,
                        icon,
                        value: convertWeatherValueToUnit(item, key)[0]
                        // subvalue: 'uv'
                    };
                }
                break;
            case WeatherProps.windGust:
                if (item.windGust && (!item.windSpeed || (item.windGust > 30 && item.windGust > 2 * item.windSpeed))) {
                    const data = convertWeatherValueToUnit(item, key);
                    return {
                        key,
                        iconFontSize,
                        paint: wiPaint,
                        backgroundColor: isEInk ? (item.windGust >= 50 ? '#000000' : undefined) : item.windGust >= 80 ? '#ff0353' : item.windGust > 50 ? '#FFBC03' : undefined,
                        customDrawColor: isEInk ? '#000000' : item.windGust > 80 ? 'white' : item.windGust > 50 ? 'black' : '#FFBC03',
                        color: isEInk ? '#000000' : item.windGust >= 80 ? '#ff0353' : item.windGust >= 50 ? '#FFBC03' : undefined,
                        icon,
                        value: data[0],
                        subvalue: data[1],
                        customDraw(canvas: Canvas, fontScale: number, textPaint: Paint, data: CommonData, x: number, y: number, withIcon = false) {
                            textPaint.setTextSize(11 * fontScale);
                            if (data.customDrawColor) {
                                textPaint.setColor(data.customDrawColor);
                            }
                            const staticLayout = new StaticLayout(
                                withIcon
                                    ? createNativeAttributedString(
                                          {
                                              spans: [
                                                  {
                                                      fontFamily: data.paint.fontFamily,
                                                      fontSize: data.iconFontSize * 0.9,
                                                      color: data.customDrawColor,
                                                      text: data.icon,
                                                      verticalAlignment: 'center'
                                                  },
                                                  {
                                                      text: ` ${data.value} ${data.subvalue}`,
                                                      verticalAlignment: 'center'
                                                  }
                                              ]
                                          },
                                          null
                                      )
                                    : `${data.value} ${data.subvalue}`,
                                textPaint,
                                canvas.getWidth(),
                                LayoutAlignment.ALIGN_NORMAL,
                                1,
                                0,
                                false
                            );

                            canvas.save();
                            let result = 0;
                            switch (textPaint.getTextAlign()) {
                                case Align.CENTER:
                                    canvas.translate(x, y);
                                    break;
                                case Align.LEFT:
                                    canvas.translate(x + 4, y);
                                    break;
                                case Align.RIGHT:
                                    canvas.translate(x - 4, y);
                                    break;
                            }
                            const width = staticLayout.getLineWidth(0);
                            if (data.backgroundColor) {
                                const oldColor = textPaint.getColor();
                                // this fixes a current issue with the Paint getDrawTextAttribs is set on Paint in getHeight
                                // if we change the paint color to draw the rect
                                // then if we do it too soon the paint getDrawTextAttribs is going to use that new
                                // color and thus we loose the color set before for the text
                                const height = staticLayout.getHeight();
                                if (isEInk) {
                                    textPaint.setStyle(Style.STROKE);
                                } else {
                                    textPaint.setColor(data.backgroundColor);
                                }
                                switch (textPaint.getTextAlign()) {
                                    case Align.CENTER:
                                        canvas.drawRoundRect(-width / 2 - 4, -1, width / 2 + 4, height - 0, 4, 4, textPaint);
                                        break;
                                    case Align.LEFT:
                                        canvas.drawRoundRect(-4, -1, width + 4, height - 0, 4, 4, textPaint);
                                        break;
                                    case Align.RIGHT:
                                        canvas.drawRoundRect(-width - 4, -1, -4, height - 0, 4, 4, textPaint);
                                        break;
                                }
                                if (isEInk) {
                                    textPaint.setStyle(Style.FILL);
                                }
                                textPaint.setColor(oldColor);
                            }
                            result = width + 16;

                            staticLayout.draw(canvas);
                            canvas.restore();
                            return result;
                        }
                    };
                }
                break;

            case WeatherProps.dewpoint: {
                // const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    paint: mdiPaint,
                    value: formatWeatherValue(item, key),
                    icon
                    // value: data[0],
                    // subvalue: data[1]
                };
            }

            case WeatherProps.relativeHumidity: {
                // const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    paint: wiPaint,
                    icon,
                    value: formatWeatherValue(item, key)
                    // subvalue: data[1]
                };
            }
            case WeatherProps.sealevelPressure: {
                const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    paint: wiPaint,
                    icon,
                    // value: formatWeatherValue(item, key),
                    value: data[0],
                    subvalue: data[1]
                };
            }
            case WeatherProps.moon:
                return {
                    key,
                    paint: wiPaint,
                    iconFontSize,
                    icon,
                    color: getWeatherDataColor(key),
                    value: lc('moon')
                };
            case WeatherProps.windBeaufort:
                if (item.windBeaufortIcon) {
                    return {
                        key,
                        paint: wiPaint,
                        iconFontSize,
                        icon
                    };
                }
                break;
            case WeatherProps.waveHeight:
                if (Math.round(item.waveHeight) > 0 || Math.round(item.waveHeightMax) > 0) {
                    return {
                        key,
                        iconFontSize,
                        iconColor: getWeatherDataColor(key),
                        paint: mdiPaint,
                        icon,
                        value: formatValueToUnit(item.waveHeight, propToUnit(key, item), defaultPropUnit(key)),
                        subvalue: lc('max') + ': ' + formatValueToUnit(item.waveHeightMax, propToUnit(key, item), defaultPropUnit(key))
                    };
                }
                break;
            case WeatherProps.seaTemperature:
                return {
                    key,
                    iconFontSize,
                    iconColor: getWeatherDataColor(key),
                    paint: mdiPaint,
                    icon,
                    value: formatWeatherValue(item, key)
                };
                break;
            case WeatherProps.swellHeight:
                if (Math.round(item.swellHeight) > 0) {
                    return {
                        key,
                        iconFontSize,
                        iconColor: getWeatherDataColor(key),
                        paint: mdiPaint,
                        icon,
                        value: formatValueToUnit(item.waveHeight, propToUnit(key, item), defaultPropUnit(key))
                    };
                }
                break;
            default:
                break;
        }
    }
}
export const weatherDataService = new DataService();

export async function showHourlyPopover(
    item: CommonWeatherData,
    props?: Partial<ComponentProps<HourlyPopover__SvelteComponent_>>,
    options?: Partial<PopoverOptions<ComponentProps<HourlyPopover__SvelteComponent_>>>,
    onCreated?
) {
    const HourlyPopover = (await import('~/components/HourlyPopover.svelte')).default;
    return showPopover(
        {
            view: HourlyPopover,
            vertPos: VerticalPosition.ALIGN_TOP,
            horizPos: HorizontalPosition.ALIGN_LEFT,
            focusable: false,
            hideArrow: true,
            props: {
                item,
                ...(props || {})
            },
            ...(options || {})
        },
        onCreated
    );
}

export function convertWeatherValueToUnit(item: CommonWeatherData, key: WeatherProps, options?: { prefix?: string; join?: string; unitScale?: number; roundedTo05?: boolean; round?: boolean }) {
    return convertValueToUnit(item[key], propToUnit(key, item), defaultPropUnit(key), options);
}
export function formatWeatherValue(item: CommonWeatherData, key: WeatherProps, options?: { prefix?: string; join?: string; unitScale?: number; roundedTo05?: boolean; canForcePrecipUnit?: boolean }) {
    if (key === WeatherProps.iconId) {
        return iconService.getIcon(item.iconId, item.isDay, false);
    }
    return formatValueToUnit(item[key], propToUnit(key, item, options), defaultPropUnit(key), options);
}

export function colorForUV(value) {
    return getIndexedColor(value, UV_LEVEL_INDEXES, UV_LEVEL_COLORS);
    // if (uvIndex >= 11) {
    //     return '#9E47CC';
    // } else if (uvIndex >= 8) {
    //     return '#F55023';
    // } else if (uvIndex >= 6) {
    //     return '#FE8F00';
    // } else if (uvIndex >= 3) {
    //     return '#FFBC03';
    // } else {
    //     return '#9BC600';
    // }
}
