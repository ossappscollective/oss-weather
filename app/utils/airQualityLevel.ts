// lower bounds of the levels above the first one: european AQI bands (good, fair, moderate, poor,
// very poor, extremely poor), pollen bands (none/low up to very high)
export const AQI_THRESHOLDS = [20, 40, 60, 80, 100];
export const POLLEN_THRESHOLDS = [1, 25, 50, 75, 100];

// i18n keys and modern (muted) colors of the levels
export const AQI_LEVEL_KEYS = ['aqi_good', 'aqi_fair', 'aqi_moderate', 'aqi_poor', 'aqi_very_poor', 'aqi_extremely_poor'];
export const MODERN_LEVEL_COLORS = ['#639922', '#97C459', '#EF9F27', '#D85A30', '#E24B4A', '#7F77DD'];

export function levelIndex(value: number | null, thresholds: number[]) {
    if (value === null || !Number.isFinite(value)) {
        return null;
    }
    const index = thresholds.findIndex((threshold) => value < threshold);
    return index === -1 ? thresholds.length : index;
}
