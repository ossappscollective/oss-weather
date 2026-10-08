// compact duration: "10 h 51", "42 min" (daylight, daylight left)
export function formatHoursMinutes(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
        return '';
    }
    const totalMinutes = Math.round(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${minutes} min`;
}
