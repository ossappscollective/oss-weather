import { lc } from '@nativescript-community/l';
import { TextFieldProperties } from '@nativescript-community/ui-material-textfield';
import { ApplicationSettings } from '@nativescript/core';
import { WeatherLocation } from '~/services/api';
import { WeatherData } from '~/services/providers/weather';
import { GetWeatherOptions, WeatherProvider } from '~/services/providers/weatherprovider';

export const SETTINGS_WEATHER_MAP_COLORS = 'weather_map_colors';
export const SETTINGS_WEATHER_MAP_ANIMATION_SPEED = 'weather_map_animation_speed';
export const SETTINGS_WEATHER_MAP_LAYER_OPACITY = 'weather_map_layer_opacity';
export const SETTINGS_WEATHER_MAP_SHOW_SNOW = 'weather_map_show_snow';
export const SETTINGS_WEATHER_MAP_CUSTOM_TILE_SOURCE = 'weather_map_custom_tile_source';
export const SETTINGS_WEATHER_MAP_TIME_INTERVAL = 'weather_map_time_interval';
export const SETTINGS_WEATHER_MAP_LAYER = 'weather_map_layer';

export const WEATHER_MAP_COLORS = 'RADAR';
export const WEATHER_MAP_LAYER = 'radar';
export const WEATHER_MAP_ANIMATION_SPEED = 100;
export const WEATHER_MAP_LAYER_OPACITY = 0.8;
export const WEATHER_MAP_SHOW_SNOW = true;
export const WEATHER_MAP_LAYERS = ['radar', 'precipitation', 'wind', 'temperature', 'pressure'];
export const WEATHER_MAP_COLOR_SCHEMES = [
    /**
     * A fully transparent [0, 0, 0, 0] colorramp to hide data.
     * Defined in interval [0, 1], without unit.
     */
    'NULL',
    /**
     * Classic jet color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'JET',
    /**
     * Classic HSV color ramp (hue, saturation, value).
     * Defined in interval [0, 1], without unit.
     */
    'HSV',
    /**
     * Classic hot color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'HOT',
    /**
     * Classic spring color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'SPRING',
    /**
     * Classic summer color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'SUMMER',
    /**
     * Classic autommn color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'AUTOMN',
    /**
     * Classic winter color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'WINTER',
    /**
     * Classic bone color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'BONE',
    /**
     * Classic copper color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'COPPER',
    /**
     * Classic greys color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'GREYS',
    /**
     * Classic yignbu color ramp (blue to light yellow).
     * Defined in interval [0, 1], without unit.
     */
    'YIGNBU',
    /**
     * Classic greens color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'GREENS',
    /**
     * Classic yiorrd color ramp (red to light yellow).
     * Defined in interval [0, 1], without unit.
     */
    'YIORRD',
    /**
     * Classic blue-red color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'BLUERED',
    /**
     * Classic rdbu color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'RDBU',
    /**
     * Classic picnic color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'PICNIC',
    /**
     * Classic rainbow color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'RAINBOW',
    /**
     * Classic Portland color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'PORTLAND',
    /**
     * Classic blackbody color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'BLACKBODY',
    /**
     * Classic earth color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'EARTH',
    /**
     * Classic electric color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'ELECTRIC',
    /**
     * Classic viridis color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'VIRIDIS',
    /**
     * Classic inferno color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'INFERNO',
    /**
     * Classic magma color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'MAGMA',
    /**
     * Classic plasma color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'PLASMA',
    /**
     * Classic warm color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'WARM',
    /**
     * Classic cool color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'COOL',
    /**
     * Classic rainboz soft color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'RAINBOW_SOFT',
    /**
     * Classic bathymetry color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'BATHYMETRY',
    /**
     * Classic cdom color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'CDOM',
    /**
     * Classic chlorophyll color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'CHLOROPHYLL',
    /**
     * Classic density color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'DENSITY',
    /**
     * Classic freesurface blue color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'FREESURFACE_BLUE',
    /**
     * Classic freesurface red color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'FREESURFACE_RED',
    /**
     * Classic oxygen color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'OXYGEN',
    /**
     * Classic par color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'PAR',
    /**
     * Classic phase color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'PHASE',
    /**
     * Classic salinity color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'SALINITY',
    /**
     * Classic temperature color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'TEMPERATURE',
    /**
     * Classic turbidity color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'TURBIDITY',
    /**
     * Classic velocity blue color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'VELOCITY_BLUE',
    /**
     * Classic velocity green color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'VELOCITY_GREEN',
    /**
     * Classic cube helix color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'CUBEHELIX',
    /**
     * The cividis color ramp is color blind friendly.
     * Read more here https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0199239
     * Defined in interval [0, 1], without unit.
     */
    'CIVIDIS',
    /**
     * Classic turbo color ramp.
     * This is a luminance-constant alternative to the jet, making it more
     * clor-blind friendly.
     * Defined in interval [0, 1], without unit.
     */
    'TURBO',
    /**
     * The rocket color ramp is perceptually uniform, which makes it more
     * color bliend friendly than the classic magma color ramp.
     * Defined in interval [0, 1], without unit.
     */
    'ROCKET',
    /**
     * The mako color ramp is perceptually uniform and can be seen as
     * a color blind friendly alternative to bathymetry or yignbu.
     * Defined in interval [0, 1], without unit.
     */
    'MAKO',
    /**
     * Elevation terrain, values are in meter.
     * Defined in interval [-10001, 8000].
     */
    'TERRAIN',
    /**
     * Atmospheric pressure, values in hPa (or millibar)
     * Defined in interval [900, 1080].
     */
    'PRESSURE',
    /**
     * Atmospheric pressure, values in hPa (or millibar).
     * Defined in interval [900, 1080].
     */
    'PRESSURE_2',
    /**
     * Atmospheric pressure, values in hPa (or millibar).
     * Defined in interval [900, 1080].
     */
    'PRESSURE_3',
    /**
     * Atmospheric pressure, values in hPa (or millibar).
     * Defined in interval [900, 1080]. The main difference
     * with PRESSURE_3 is the true neutral zone (pale gray)
     * from 1012.5 to 1013.5hPa
     */
    'PRESSURE_4',
    /**
     * Temperatures in degree Celsius.
     * Defined in interval [-70.15, 46.85].
     */
    'TEMPERATURE_2',
    /**
     * Temperatures in degrees Celsius.
     * Defined in interval [-65, 55].
     */
    'TEMPERATURE_3',
    /**
     * Precipitation in mm per hour.
     *  Defined in interval [0, 50].
     */
    'PRECIPITATION',
    /**
     * precipitation in mm per hour.
     *  Defined in interval [0, 50].
     */
    'PRECIPITATION_2',
    /**
     * Radar color ramp from NOAA in dBZ.
     *  Defined in interval [0, 75].
     */
    'RADAR',
    /**
     * Intended to be used with Radar data to create a slighly blue-tinted greyscale
     * to represent cloud coverage. Values are in dBZ.
     * Defined in interval [4, 60].
     */
    'RADAR_CLOUD',
    /**
     * This atmospheric pressure color ramp is based on cividis,
     * hence it is more clor bliend friendly. Values are in hPa (or millibar).
     * Defined in interval [900, 1080].
     */
    'PRESSURE_CIVIDIS',
    /**
     * This rocket color ramp scaled for radar data is a color blind
     * friendly alternative. Values are in dBZ.
     * Defined in interval [0, 75]
     */
    'RADAR_ROCKET',
    /**
     * This rocket color ramp scaled for wind speed is a color blind
     * friendly alternative. Values are in m/sec.
     * Defined in interval [0, 30]
     */
    'WIND_ROCKET',
    /**
     * This mako color ramps is scale for precipitation is a color blind
     * friendly alternative. Values are in mm/hour
     * Defined in interval [0, 50].
     */
    'MAKO_PRECIPITATION',
    /**
     * Based on the turbo color ramp, this one is scaled
     * to render temperatures in degree Celcius.
     * This is a perceptually uniform alternative to jet, making it more color bliend friendly.
     * Defined in interval [-65, 55].
     */
    'TEMPERATURE_TURBO'
];

export function getLayerTitle(layer: string) {
    switch (layer) {
        case 'precipitation':
            return lc('precipitation');

        case 'radar':
            return lc('radar');

        case 'pressure':
            return lc('pressure');

        case 'wind':
            return lc('wind');

        case 'temperature':
            return lc('temperature');

        default:
            break;
    }
}

const API_KEY_SETTING = 'maptilerApiKey';

export class MaptilerProvider extends WeatherProvider {
    getWeather(weatherLocation: WeatherLocation, options?: GetWeatherOptions): Promise<WeatherData> {
        throw new Error('Method not implemented.');
    }
    static id = 'openweathermap';
    id = MaptilerProvider.id;
    static apiKey = MaptilerProvider.readApiKeySetting();

    static readApiKeySetting() {
        let key = ApplicationSettings.getString(API_KEY_SETTING, null);
        // DEV_LOG && console.log('readapiKeySetting', key);
        if (!key || key?.length === 0) {
            ApplicationSettings.remove(API_KEY_SETTING);
            key = null;
        }
        return key?.trim();
    }

    public static setApiKey(apiKey) {
        MaptilerProvider.apiKey = apiKey?.trim();
        if (MaptilerProvider.apiKey?.length) {
            ApplicationSettings.setString(API_KEY_SETTING, MaptilerProvider.apiKey);
        } else {
            ApplicationSettings.remove(API_KEY_SETTING);
        }
    }
    public requiresApiKey() {
        return true;
    }

    public static hasApiKey() {
        return !!MaptilerProvider.apiKey && MaptilerProvider.apiKey.length > 0;
    }

    public static getApiKey() {
        return MaptilerProvider.apiKey;
    }
    public static getUrl() {
        return 'https://cloud.maptiler.com';
    }
    public static getApiKeyDescription() {
        return lc('maptiler_api_key_required_description', MaptilerProvider.getUrl());
    }
    public static getSettings() {
        return [
            {
                type: 'prompt',
                valueType: 'string',
                id: 'setting',
                key: API_KEY_SETTING,
                default: () => MaptilerProvider.apiKey,
                description: MaptilerProvider.getApiKeyDescription(),
                title: lc('maptiler_api_key')
            },
            {
                key: SETTINGS_WEATHER_MAP_COLORS,
                id: 'setting',
                valueType: 'string',
                title: lc('weather_map_colors'),
                currentValue: () => ApplicationSettings.getString(SETTINGS_WEATHER_MAP_COLORS, WEATHER_MAP_COLORS),
                values: WEATHER_MAP_COLOR_SCHEMES.map((value) => ({
                    value,
                    title: value.replaceAll('_', ' ').toLowerCase()
                })),
                description: () => ApplicationSettings.getString(SETTINGS_WEATHER_MAP_COLORS, WEATHER_MAP_COLORS).replaceAll('_', ' ').toLowerCase()
            },
            {
                key: SETTINGS_WEATHER_MAP_LAYER,
                id: 'setting',
                valueType: 'string',
                title: lc('weather_map_layer'),
                currentValue: () => ApplicationSettings.getString(SETTINGS_WEATHER_MAP_LAYER, WEATHER_MAP_LAYER),
                values: WEATHER_MAP_LAYERS.map((value) => ({
                    value,
                    title: getLayerTitle(value)
                })),
                description: () => getLayerTitle(ApplicationSettings.getString(SETTINGS_WEATHER_MAP_LAYER, WEATHER_MAP_LAYER))
            },
            {
                id: 'setting',
                key: SETTINGS_WEATHER_MAP_ANIMATION_SPEED,
                min: 0.1,
                max: 2,
                step: null,
                title: lc('animation_speed'),
                type: 'slider',
                valueFormatter: (value) => value.toFixed(2),
                transformValue: (value) => Math.round(WEATHER_MAP_ANIMATION_SPEED / value),
                rightValue: () => Math.round((WEATHER_MAP_ANIMATION_SPEED / ApplicationSettings.getNumber(SETTINGS_WEATHER_MAP_ANIMATION_SPEED, WEATHER_MAP_ANIMATION_SPEED)) * 100) / 100
            },
            {
                id: 'setting',
                key: SETTINGS_WEATHER_MAP_LAYER_OPACITY,
                min: 0,
                max: 1,
                step: null,
                title: lc('layer_opacity'),
                type: 'slider',
                valueFormatter: (value) => value.toFixed(2),
                transformValue: (value) => value,
                rightValue: () => Math.round(ApplicationSettings.getNumber(SETTINGS_WEATHER_MAP_LAYER_OPACITY, WEATHER_MAP_LAYER_OPACITY) * 100) / 100
            },
            // {
            //     type: 'switch',
            //     icon: 'mdi-snowflake',
            //     id: SETTINGS_WEATHER_MAP_SHOW_SNOW,
            //     title: lc('show_snow'),
            //     value: ApplicationSettings.getBoolean(SETTINGS_WEATHER_MAP_SHOW_SNOW, WEATHER_MAP_SHOW_SNOW)
            // },
            {
                type: 'prompt',
                icon: 'mdi-server',
                valueType: 'string',
                default: () => ApplicationSettings.getString(SETTINGS_WEATHER_MAP_CUSTOM_TILE_SOURCE, null),
                id: 'setting',
                key: SETTINGS_WEATHER_MAP_CUSTOM_TILE_SOURCE,
                description: ApplicationSettings.getString(SETTINGS_WEATHER_MAP_CUSTOM_TILE_SOURCE, null),
                title: lc('custom_tile_server'),

                textFieldProperties: {
                    autocapitalizationType: 'none',
                    autocorrect: false
                } as TextFieldProperties
            }
        ];
    }
}
