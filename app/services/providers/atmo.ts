import { ApplicationSettings } from '@akylas/nativescript';
import { WeatherLocation, request } from '../api';
import { AirQualityProvider } from './airqualityprovider';
import { prefs } from '../preferences';
import dayjs from 'dayjs';
import { AirQualityData, CommonAirQualityData, Hourly } from './weather';
import { Pollutants, prepareAirQualityData } from '../airQualityData';
import { aqiDataIconColors } from '~/helpers/formatter';
import { lc } from '@nativescript-community/l';

const KEY_MAPPING = {
    'pm2.5': Pollutants.PM25
};

export class AtmoProvider extends AirQualityProvider {
    static id = 'atmo';
    id = AtmoProvider.id;
    static apiKey = AtmoProvider.readApiKeySetting();

    // name = lc('provider_aqi.atmo');
    privacyPolicyUrl = `${AtmoProvider.getUrl()}/article/politique-de-confidentialite`;

    static getUrl() {
        return 'https://www.atmo-auvergnerhonealpes.fr';
    }

    static readApiKeySetting() {
        let key = ApplicationSettings.getString('atmoApiKey', ATMO_DEFAULT_KEY);
        if (!key || key?.length === 0) {
            ApplicationSettings.remove('atmoApiKey');
            key = ATMO_DEFAULT_KEY;
        }
        return key?.trim();
    }
    private async fetch<T = any>(weatherLocation: WeatherLocation) {
        return request<T>({
            url: 'https://api.atmo-aura.fr/air2go/v3/point?with_list=true',
            method: 'GET',
            timeout: 30000,
            queryParams: {
                api_token: AtmoProvider.apiKey,
                x: weatherLocation.coord.lon,
                y: weatherLocation.coord.lat,
                datetime_echeance: dayjs().add(1, 'd').format('YYYY-MM-DDTHH:mm:ssZ[Z]') // Tomorrow because it gives access to D-1 and D+1
            },
            headers: {
                'Cache-Control': `max-age=${60 * 5}`
            }
        });
    }
    async getAirQuality(weatherLocation: WeatherLocation, options?: { model?: string; warnings?: boolean; minutely?: boolean; hourly?: boolean; current?: boolean; forceModel?: boolean }) {
        const result = await this.fetch(weatherLocation);

        const daily: { tempDatas: { [k: string]: { sum: number; count: number; unit: string; path: string } }; [k: string]: any }[] = [];
        let lastDay: { tempDatas: { [k: string]: { sum: number; count: number; unit: string; path: string } }; [k: string]: any };
        const polluants = result.content.polluants;
        if (polluants.length === 0 || !polluants[0].horaires) {
            return;
        }
        const keys = polluants.map((p) => p.polluant).filter((s) => !!s);
        const hourlyData = polluants[0].horaires.map((data, index) => {
            const d = {} as Hourly;
            const date = dayjs(data.datetime_echeance);
            d.time = date.valueOf();
            const currentDay = date.utc().startOf('d').valueOf();
            if (!lastDay || currentDay !== lastDay.time) {
                lastDay = {
                    time: currentDay,
                    tempDatas: {}
                };
                daily.push(lastDay);
            }
            for (let j = 0; j < keys.length; j++) {
                const k = keys[j];
                const value = polluants[j].horaires[index].concentration;
                const actualKey: string = KEY_MAPPING[k] || k;
                const path = 'pollutants';
                // if (actualKey === 'aqi') {
                //     d.aqi = value;
                // } else

                d.pollutants = d.pollutants || {};
                d.pollutants[actualKey] = { value, unit: 'μg/m³' };

                lastDay.tempDatas[actualKey] = lastDay.tempDatas[actualKey] || { sum: 0, count: 0, unit: 'μg/m³', path };
                lastDay.tempDatas[actualKey].sum += value;
                lastDay.tempDatas[actualKey].count += 1;
            }
            return prepareAirQualityData(d, lastDay);
        });
        const lastDailyIndex = daily.findIndex((d) => d.tempDatas.aqi.count < 3);
        const r = {
            time: dayjs(result.content.datetime_echeance).valueOf(),
            daily: {
                data: daily.slice(0, lastDailyIndex >= 0 ? lastDailyIndex : daily.length).map((d) =>
                    prepareAirQualityData({
                        time: d.time,
                        ...Object.keys(d.tempDatas).reduce((acc, val) => {
                            const tempData = d.tempDatas[val];
                            let data = acc;
                            if (tempData.path) {
                                data = acc[tempData.path] = acc[tempData.path] || {};
                                data[val] = { value: Math.round(tempData.sum / tempData.count), unit: tempData.unit };
                            } else {
                                data[val] = Math.round(tempData.sum / tempData.count);
                            }
                            return acc;
                        }, {})
                    } as CommonAirQualityData)
                )
            },
            hourly: hourlyData
        } as AirQualityData;
        DEV_LOG && console.log(JSON.stringify(r.daily.data));
        r.hourly = hourlyData;
        return r;
    }
}

prefs.on('key:atmoApiKey', (event) => {
    AtmoProvider.apiKey = AtmoProvider.readApiKeySetting();
});
