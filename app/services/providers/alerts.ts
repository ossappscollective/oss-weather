import type { AccuWeatherAlert } from './accuweather';
import type { Alert as OWMAlert } from './openweathermap';
import type { Alert } from './weather';

/**
 * Weather alert helpers shared by every provider.
 *
 * Kept free of any NativeScript import so the mapping logic stays unit testable.
 */

export enum AlertSeverity {
    UNKNOWN = 0,
    MINOR = 1,
    MODERATE = 2,
    SEVERE = 3,
    EXTREME = 4
}

export function colorFromSeverity(severity: AlertSeverity): string {
    switch (severity) {
        case AlertSeverity.EXTREME:
            return '#cc0000';
        case AlertSeverity.SEVERE:
            return '#ffb82b';
        case AlertSeverity.MODERATE:
            return '#cbd600';
        case AlertSeverity.MINOR:
            return '#31aa35';
        default:
            return null;
    }
}

/** Météo France vigilance level: 1 green, 2 yellow, 3 orange, 4 red. */
export function severityFromVigilanceColorId(colorId: number): AlertSeverity {
    switch (colorId) {
        case 4:
            return AlertSeverity.EXTREME;
        case 3:
            return AlertSeverity.SEVERE;
        case 2:
            return AlertSeverity.MODERATE;
        case 1:
            return AlertSeverity.MINOR;
        default:
            return AlertSeverity.UNKNOWN;
    }
}

/** Overseas vigilance levels are only named, not numbered the same way as the metropolitan ones. */
export function severityFromColorName(colorName: string): AlertSeverity {
    const name = colorName?.toLowerCase() ?? '';
    if (name.includes('rouge') || name.includes('violet')) {
        return AlertSeverity.EXTREME;
    }
    if (name.includes('orange')) {
        return AlertSeverity.SEVERE;
    }
    if (name.includes('jaune') || name.includes('blanc')) {
        return AlertSeverity.MODERATE;
    }
    if (name.includes('vert') || name.includes('bleu')) {
        return AlertSeverity.MINOR;
    }
    return AlertSeverity.UNKNOWN;
}

export function sortAlerts(alerts: Alert[]): Alert[] {
    return alerts.sort((alert1, alert2) => (alert2.severity ?? AlertSeverity.UNKNOWN) - (alert1.severity ?? AlertSeverity.UNKNOWN) || alert1.start - alert2.start);
}

/** One Call gives `start`/`end` in seconds and no severity. */
export function normalizeOwmAlerts(alerts: OWMAlert[]): Alert[] {
    if (!alerts?.length) {
        return [];
    }
    return alerts.map((alert) => ({
        sender_name: alert.sender_name,
        event: alert.event,
        start: alert.start * 1000,
        end: alert.end * 1000,
        description: alert.description,
        tags: alert.tags,
        severity: AlertSeverity.UNKNOWN
    }));
}

function hexFromChannels(red: number, green: number, blue: number): string {
    return `#${[red, green, blue]
        .map((channel) =>
            Math.max(0, Math.min(255, Math.round(channel)))
                .toString(16)
                .padStart(2, '0')
        )
        .join('')}`;
}

function severityFromAccuPriority(priority: number): AlertSeverity {
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
        const severity = severityFromAccuPriority(result.Priority);
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
