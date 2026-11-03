// AccuWeather API Type Definitions

export interface AccuWeatherCoord {
    Latitude: number;
    Longitude: number;
}

export interface AccuWeatherLocation {
    Key: string;
    LocalizedName: string;
    Country: {
        ID: string;
        LocalizedName: string;
    };
    TimeZone: {
        Name: string;
        GmtOffset: number;
    };
    GeoPosition: AccuWeatherCoord;
}

// Current Conditions
export interface AccuWeatherCurrentConditions {
    LocalObservationDateTime: string;
    EpochTime: number;
    WeatherText: string;
    WeatherIcon: number;
    HasPrecipitation: boolean;
    PrecipitationType?: string;
    IsDayTime: boolean;
    Temperature: {
        Metric: {
            Value: number;
            Unit: string;
        };
        Imperial: {
            Value: number;
            Unit: string;
        };
    };
    RealFeelTemperature: {
        Metric: {
            Value: number;
            Unit: string;
        };
        Imperial: {
            Value: number;
            Unit: string;
        };
    };
    RelativeHumidity: number;
    DewPoint: {
        Metric: {
            Value: number;
            Unit: string;
        };
    };
    Wind: {
        Direction: {
            Degrees: number;
        };
        Speed: {
            Metric: {
                Value: number;
                Unit: string;
            };
        };
    };
    WindGust?: {
        Speed: {
            Metric: {
                Value: number;
                Unit: string;
            };
        };
    };
    UVIndex: number;
    UVIndexText: string;
    Visibility: {
        Metric: {
            Value: number;
            Unit: string;
        };
    };
    CloudCover: number;
    Pressure: {
        Metric: {
            Value: number;
            Unit: string;
        };
    };
    PrecipitationSummary?: {
        PastHour?: {
            Metric: {
                Value: number;
                Unit: string;
            };
        };
        Past3Hours?: {
            Metric: {
                Value: number;
                Unit: string;
            };
        };
    };
}

// Hourly Forecast
export interface AccuWeatherHourlyForecast {
    DateTime: string;
    EpochDateTime: number;
    WeatherIcon: number;
    IconPhrase: string;
    HasPrecipitation: boolean;
    IsDaylight: boolean;
    Temperature: {
        Value: number;
        Unit: string;
    };
    RealFeelTemperature: {
        Value: number;
        Unit: string;
    };
    DewPoint: {
        Value: number;
        Unit: string;
    };
    Wind: {
        Speed: {
            Value: number;
            Unit: string;
        };
        Direction: {
            Degrees: number;
        };
    };
    WindGust?: {
        Speed: {
            Value: number;
            Unit: string;
        };
    };
    RelativeHumidity: number;
    Visibility: {
        Value: number;
        Unit: string;
    };
    CloudCover: number;
    UVIndex: number;
    UVIndexText: string;
    PrecipitationProbability: number;
    RainProbability?: number;
    SnowProbability?: number;
    IceProbability?: number;
    TotalLiquid?: {
        Value: number;
        Unit: string;
    };
    Rain?: {
        Value: number;
        Unit: string;
    };
    Snow?: {
        Value: number;
        Unit: string;
    };
    Ice?: {
        Value: number;
        Unit: string;
    };
}

// Daily Forecast
export interface AccuWeatherDailyForecast {
    Date: string;
    EpochDate: number;
    Sun?: {
        Rise: string;
        EpochRise: number;
        Set: string;
        EpochSet: number;
    };
    Moon?: {
        Rise: string;
        EpochRise: number;
        Set: string;
        EpochSet: number;
        Phase: string;
    };
    Temperature: {
        Minimum: {
            Value: number;
            Unit: string;
        };
        Maximum: {
            Value: number;
            Unit: string;
        };
    };
    RealFeelTemperature: {
        Minimum: {
            Value: number;
            Unit: string;
        };
        Maximum: {
            Value: number;
            Unit: string;
        };
    };
    HoursOfSun?: number;
    DegreeDaySummary?: {
        Heating: {
            Value: number;
            Unit: string;
        };
        Cooling: {
            Value: number;
            Unit: string;
        };
    };
    AirAndPollen?: Array<{
        Name: string;
        Value: number;
        Category: string;
        CategoryValue: number;
        Type?: string;
    }>;
    Day: {
        Icon: number;
        IconPhrase: string;
        HasPrecipitation: boolean;
        PrecipitationType?: string;
        PrecipitationIntensity?: string;
        ShortPhrase: string;
        LongPhrase: string;
        PrecipitationProbability: number;
        ThunderstormProbability?: number;
        RainProbability?: number;
        SnowProbability?: number;
        IceProbability?: number;
        Wind: {
            Speed: {
                Value: number;
                Unit: string;
            };
            Direction: {
                Degrees: number;
            };
        };
        WindGust?: {
            Speed: {
                Value: number;
                Unit: string;
            };
        };
        TotalLiquid?: {
            Value: number;
            Unit: string;
        };
        Rain?: {
            Value: number;
            Unit: string;
        };
        Snow?: {
            Value: number;
            Unit: string;
        };
        Ice?: {
            Value: number;
            Unit: string;
        };
        HoursOfPrecipitation?: number;
        HoursOfRain?: number;
        HoursOfSnow?: number;
        HoursOfIce?: number;
        CloudCover?: number;
    };
    Night: {
        Icon: number;
        IconPhrase: string;
        HasPrecipitation: boolean;
        PrecipitationType?: string;
        PrecipitationIntensity?: string;
        ShortPhrase: string;
        LongPhrase: string;
        PrecipitationProbability: number;
        ThunderstormProbability?: number;
        RainProbability?: number;
        SnowProbability?: number;
        IceProbability?: number;
        Wind: {
            Speed: {
                Value: number;
                Unit: string;
            };
            Direction: {
                Degrees: number;
            };
        };
        WindGust?: {
            Speed: {
                Value: number;
                Unit: string;
            };
        };
        TotalLiquid?: {
            Value: number;
            Unit: string;
        };
        Rain?: {
            Value: number;
            Unit: string;
        };
        Snow?: {
            Value: number;
            Unit: string;
        };
        Ice?: {
            Value: number;
            Unit: string;
        };
        HoursOfPrecipitation?: number;
        HoursOfRain?: number;
        HoursOfSnow?: number;
        HoursOfIce?: number;
        CloudCover?: number;
    };
}

export interface AccuWeatherDailyForecastResponse {
    Headline: {
        EffectiveDate: string;
        EffectiveEpochDate: number;
        Severity: number;
        Text: string;
        Category: string;
        EndDate: string;
        EndEpochDate: number;
    };
    DailyForecasts: AccuWeatherDailyForecast[];
}

// Air Quality
export interface AccuWeatherAirQuality {
    DateTime: string;
    EpochDateTime: number;
    Index: number;
    ParticulateMatter2_5?: number;
    ParticulateMatter10?: number;
    Ozone?: number;
    CarbonMonoxide?: number;
    NitrogenDioxide?: number;
    SulfurDioxide?: number;
    Category?: string;
    CategoryValue?: number;
    Source?: string;
}
