import { hasEnoughForecast } from '~/utils/forecastCoverage';

interface Forecast {
    hourly: { time: number }[];
    daily: { data: { time: number }[] };
}

const HOUR = 3600 * 1000;

// a cached forecast a widget may still show after a failed refresh: same rule as the app (enough upcoming data), past hours removed
export function staleForecast<T extends Forecast>(data: T, now: number, startOfDay: number, nbDays: number): T | null {
    if (!hasEnoughForecast(data, now, startOfDay, nbDays)) {
        return null;
    }
    const startOfHour = Math.floor(now / HOUR) * HOUR;
    return { ...data, hourly: data.hourly.filter((hour) => hour.time >= startOfHour) };
}
