export interface OneCallResult {
    lat: number;
    lon: number;
    timezone: string;
    timezone_offset: number;
    current: OWMCurrent;
    minutely: OWMMinutely[];
    hourly: OWMHourly[];
    daily: OWMDaily[];
    alerts: Alert[];
}

export interface Alert {
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
}

export interface OWMDaily {
    dt: number;
    sunrise: number;
    sunset: number;
    moonrise: number;
    moonset: number;
    moon_phase: number;
    temp: Temp;
    feels_like: Feelslike;
    pressure: number;
    humidity: number;
    dew_point: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust: number;
    weather: Weather[];
    clouds: number;
    pop: number;
    uvi: number;
    rain?: number;
    snow?: number;
}

export interface Feelslike {
    day: number;
    night: number;
    eve: number;
    morn: number;
}

export interface Temp {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
}

export interface OWMHourly {
    dt: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust: number;
    weather: Weather[];
    pop: number;
    rain?: Rain;
    snow?: Rain;
}

export interface OWMMinutely {
    dt: number;
    precipitation: number;
}

export interface OWMCurrent {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust: number;
    weather: Weather[];
}

export interface Weather {
    id: number;
    main: string;
    description: string;
    icon: string;
}

export interface Coord {
    lon: number;
    lat: number;
}

export interface Weather {
    id: number;
    main: string;
    description: string;
    icon: string;
}

export interface Main {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
}

export interface Wind {
    speed: number;
    deg: number;
}

export interface Rain {
    '1h'?: number;
    '3h'?: number;
}
export interface Snow {
    '1h'?: number;
    '3h'?: number;
}

export interface Clouds {
    all: number;
}

export interface Sys {
    type?: number;
    id?: number;
    country?: string;
    sunrise?: number;
    sunset?: number;
    pod?: string;
}

export interface Alert {
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
}
export interface CityWeather {
    coord: Coord;
    weather: Weather[];
    base: string;
    main: Main;
    visibility: number;
    wind?: Wind;
    rain?: Rain;
    snow?: Snow;
    clouds?: Clouds;
    dt: number;
    sys?: Sys;
    timezone: number;
    id: number;
    name: string;
    cod: number;
}
