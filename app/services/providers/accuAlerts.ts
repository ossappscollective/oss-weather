import type { AccuWeatherAlert } from './accuweather';
import { AlertSeverity, colorFromSeverity, hexFromChannels } from './alerts';
import type { Alert } from './weather';

/** AccuWeather alert mapping. Kept out of `accuweather.ts` so it stays unit testable. */

function severityFromPriority(priority: number): AlertSeverity {
    switch (priority) {
        case 1:
            return AlertSeverity.EXTREME;
        case 2:
            return AlertSeverity.SEVERE;
        case 3:
            return AlertSeverity.MODERATE;
        case 4:
        case 5:
            return AlertSeverity.MINOR;
        default:
            return AlertSeverity.UNKNOWN;
    }
}

export function buildAccuAlerts(results: AccuWeatherAlert[]): Alert[] {
    if (!results?.length) {
        return [];
    }
    return results.map((result) => {
        const severity = severityFromPriority(result.Priority);
        const area = result.Area?.[0];
        const color = result.Color;
        return {
            sender_name: result.Source,
            event: result.Description?.Localized,
            start: area?.EpochStartTime ? area.EpochStartTime * 1000 : undefined,
            end: area?.EpochEndTime ? area.EpochEndTime * 1000 : undefined,
            description: area?.Text,
            severity,
            color: color ? hexFromChannels(color.Red, color.Green, color.Blue) : colorFromSeverity(severity)
        };
    });
}
