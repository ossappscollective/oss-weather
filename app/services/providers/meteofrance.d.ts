export interface Coord {
    lon: number;
    lat: number;
}

interface MFForecastResult {
    update_time: number;
    type: string;
    geometry: Geometry;
    properties: ForecastProperties;
}

interface ForecastProperties {
    altitude: number;
    name: string;
    country: string;
    french_department: string;
    rain_product_available: number;
    timezone: string;
    insee: string;
    bulletin_cote: number;
    daily_forecast: Dailyforecast[];
    forecast: ForecastForecast[];
    probability_forecast: Probabilityforecast[];
}

interface Probabilityforecast {
    time: number;
    rain_hazard_3h?: number;
    rain_hazard_6h?: number;
    snow_hazard_3h?: number;
    snow_hazard_6h?: number;
    freezing_hazard?: number;
    storm_hazard?: number;
}

interface ForecastForecast {
    time: number;
    T?: number;
    T_windchill?: number;
    relative_humidity?: number;
    P_sea?: number;
    wind_speed?: number;
    wind_speed_gust?: number;
    wind_direction?: number;
    wind_icon?: string;
    rain_1h?: number;
    rain_3h?: number;
    rain_6h?: number;
    rain_12h?: any;
    rain_24h?: any;
    snow_1h?: number;
    snow_3h?: number;
    snow_6h?: number;
    snow_12h?: any;
    snow_24h?: any;
    iso0?: number;
    rain_snow_limit?: number | string;
    total_cloud_cover: number;
    weather_icon: string;
    weather_description: string;
    weather_confidence_index?: number;
}

interface Dailyforecast {
    time: number;
    T_min: number;
    T_max: number;
    T_sea?: any;
    relative_humidity_min: number;
    relative_humidity_max: number;
    total_precipitation_24h: number;
    uv_index?: number;
    daily_weather_icon: string;
    daily_weather_description: string;
    sunrise_time: number;
    sunset_time: number;
}

interface Geometry {
    type: string;
    coordinates: number[];
}

interface MFMinutely {
    update_time: number;
    type: string;
    geometry: Geometry;
    properties: RainProperties;
}

interface RainProperties {
    altitude: number;
    name: string;
    country: string;
    french_department: string;
    rain_product_available: number;
    timezone: string;
    confidence: number;
    forecast: RainForecast[];
}

interface RainForecast {
    time: number;
    rain_intensity: number;
    rain_intensity_description: string;
}

interface MFCurrent {
    update_time: number;
    type: string;
    geometry: Geometry;
    properties: CurrentProperties;
}

interface CurrentProperties {
    timezone: string;
    gridded: Gridded;
}

interface Gridded {
    time: number;
    T: number;
    T_windchill?: number;
    wind_speed: number;
    wind_direction: number;
    wind_icon: string;
    weather_icon: string;
    weather_description: string;
}

interface MFWarnings {
    update_time: number;
    end_validity_time: number;
    domain_id: string;
    color_max: number;
    timelaps: Timelap[];
    phenomenons_items: Phenomenonsitem[];
    advices?: MFWarningAdvice[];
    consequences?: MFWarningConsequence[];
    max_count_items?: any;
    comments: Comments;
    text?: MFWarningText;
    text_avalanche?: MFWarningText;
}

interface MFWarningAdvice {
    phenomenon_id: string;
    phenomenon_max_color_id: number;
    text_advice: string;
}

interface MFWarningConsequence {
    phenomenon_id: string;
    phenomenon_max_color_id: number;
    text_consequence: string;
}

interface MFWarningSubdivisionText {
    underline_text?: string;
    bold_text?: string;
    text?: string[];
}

interface MFWarningTermItem {
    term_names?: string;
    risk_name?: string;
    start_time?: string;
    end_time?: string;
    subdivision_text?: MFWarningSubdivisionText[];
}

interface MFWarningTextItem {
    type_code?: string;
    /** phenomenon id the block is about, `null` for the general situation blocks */
    hazard_code?: string;
    hazard_name?: string;
    term_items?: MFWarningTermItem[];
}

interface MFWarningTextBlocItem {
    type_name?: string;
    text_items?: MFWarningTextItem[];
}

interface MFWarningText {
    bloc_title?: string;
    text_bloc_item?: MFWarningTextBlocItem[];
}

/** `v2/warning/full`, used for overseas territories: phenomenon ids are numbers and the text is flat. */
interface MFWarningsOverseas {
    update_time: number;
    end_validity_time: number;
    domain_id: string;
    color_max: number;
    timelaps: MFOverseasTimelap[];
    advices?: MFOverseasAdvice[];
    consequences?: MFOverseasConsequence[];
    comments?: MFOverseasText;
    text?: MFOverseasText;
}

interface MFOverseasTimelap {
    phenomenon_id: number;
    timelaps_items: Timelapsitem[];
}

interface MFOverseasAdvice {
    phenomenon_id: number;
    text_advice: string;
}

interface MFOverseasConsequence {
    phenomenon_id: number;
    text_consequence: string;
}

interface MFOverseasText {
    begin_time?: number;
    end_time?: number;
    text_bloc_item?: MFOverseasTextBlocItem[];
}

interface MFOverseasTextBlocItem {
    title?: string;
    text?: string[];
}

/** `v2/warning/dictionary`, gives the overseas phenomenon names and vigilance colors. */
interface MFWarningDictionary {
    phenomenons?: MFWarningDictionaryPhenomenon[];
    colors?: MFWarningDictionaryColor[];
}

interface MFWarningDictionaryPhenomenon {
    id: number;
    name: string;
}

interface MFWarningDictionaryColor {
    id: number;
    level?: number;
    name: string;
    hexaCode: string;
}

interface Comments {
    title: string;
    text: any[];
}

interface Phenomenonsitem {
    phenomenon_id: string;
    phenomenon_max_color_id: number;
}

interface Timelap {
    phenomenon_id: string;
    timelaps_items: Timelapsitem[];
}

interface Timelapsitem {
    begin_time: number;
    end_time: number;
    color_id: number;
}
