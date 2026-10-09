// providers can start the daily forecast before today: widgets start at today, like the app
export function upcomingDays<T extends { time: number }>(days: T[], startOfDay: number): T[] {
    const firstIndex = days.findIndex((day) => day.time >= startOfDay);
    return firstIndex >= 0 ? days.slice(firstIndex) : [];
}
