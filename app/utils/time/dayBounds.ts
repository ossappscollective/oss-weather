import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

type DayInput = number | string | dayjs.Dayjs | Date;

// utcOffset(undefined) is the getter: a location without timezone offset uses the device timezone
function inTimezone(timestamp?: DayInput, timezoneOffset?: number) {
    return timezoneOffset !== undefined ? dayjs.utc(timestamp).utcOffset(timezoneOffset) : dayjs(timestamp);
}

export function startOfDay(timestamp?: DayInput, timezoneOffset?: number) {
    return inTimezone(timestamp, timezoneOffset).startOf('d');
}

export function endOfDay(timestamp?: DayInput, timezoneOffset?: number) {
    return inTimezone(timestamp, timezoneOffset).endOf('d');
}
