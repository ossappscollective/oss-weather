const HOUR = 3600 * 1000;
const MIN_HOURS = 6;
const MIN_DAYS = 2;

// whether a (cached) forecast still holds enough upcoming data to show something meaningful
export function hasEnoughForecast(data: { hourly: { time: number }[]; daily: { data: { time: number }[] } }, now: number, startOfDay: number, nbDays = MIN_DAYS) {
    const startOfHour = Math.floor(now / HOUR) * HOUR;
    const hoursAhead = data.hourly.filter((hour) => hour.time >= startOfHour).length;
    const daysAhead = data.daily.data.filter((day) => day.time >= startOfDay).length;
    return (data.hourly.length === 0 || hoursAhead >= MIN_HOURS) && daysAhead >= Math.min(MIN_DAYS, nbDays);
}
