export interface Forecast {
    latitude: number;
    longitude: number;
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    hourly_units: Hourlyunits;
    hourly: Hourly;
    daily_units: Dailyunits;
    daily: Daily;
    current_units: Currentunits;
    current: Current;
    minutely_15_units: Minutely15units;
    minutely_15: Minutely15;
}

interface Current {
    time: number;
    interval: number;
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
    is_day: number;
    cloudcover: number;
    windspeed_10m: number;
    winddirection_10m: number;
    windgusts_10m: number;
    relative_humidity_2m: number;
    pressure_msl: number;
}

interface Currentunits {
    time: string;
    interval: string;
    temperature_2m: string;
    apparent_temperature: string;
    precipitation: string;
    rain: string;
    showers: string;
    snowfall: string;
    weather_code: string;
    cloudcover: string;
    windspeed_10m: string;
    winddirection_10m: string;
    windgusts_10m: string;
}

export interface Daily {
    time: number[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    uv_index_max: number[];
    uv_index_clear_sky_max: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    showers_sum: number[];
    snowfall_sum: number[];
    precipitation_hours: number[];
    precipitation_probability_max: (null | number)[];
    windspeed_10m_max: number[];
    windgusts_10m_max: number[];
    winddirection_10m_dominant: number[];
}

export interface Dailyunits {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    apparent_temperature_max: string;
    apparent_temperature_min: string;
    uv_index_max: string;
    uv_index_clear_sky_max: string;
    precipitation_sum: string;
    rain_sum: string;
    showers_sum: string;
    snowfall_sum: string;
    precipitation_hours: string;
    precipitation_probability_max: string;
    windspeed_10m_max: string;
    windgusts_10m_max: string;
    winddirection_10m_dominant: string;
}

export interface Hourly {
    time: number[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: (null | number)[];
    precipitation: number[];
    rain: number[];
    showers: number[];
    snowfall: number[];
    snow_depth: number[];
    weather_code: number[];
    cloudcover: number[];
    cloudcover_low: number[];
    cloudcover_mid: number[];
    cloudcover_high: number[];
    windspeed_10m: number[];
    winddirection_10m: number[];
    windgusts_10m: number[];
    uv_index: number[];
    uv_index_clear_sky: number[];
    is_day: number[];
    freezinglevel_height: number[];
    snow_depth: number[];
}

export interface Hourlyunits {
    time: string;
    temperature_2m: string;
    apparent_temperature: string;
    precipitation_probability: string;
    precipitation: string;
    rain: string;
    showers: string;
    snowfall: string;
    snow_depth: string;
    weather_code: string;
    cloudcover: string;
    cloudcover_low: string;
    cloudcover_mid: string;
    cloudcover_high: string;
    windspeed_10m: string;
    winddirection_10m: string;
    windgusts_10m: string;
    uv_index: string;
    uv_index_clear_sky: string;
}

interface Minutely15 {
    time: number[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    snowfall_height: number[];
    freezinglevel_height: number[];
    weather_code: number[];
    windspeed_10m: number[];
    winddirection_10m: number[];
    windgusts_10m: number[];
}

interface Minutely15units {
    time: string;
    temperature_2m: string;
    apparent_temperature: string;
    precipitation: string;
    rain: string;
    snowfall: string;
    snowfall_height: string;
    freezinglevel_height: string;
    weather_code: string;
    windspeed_10m: string;
    winddirection_10m: string;
    windgusts_10m: string;
}
