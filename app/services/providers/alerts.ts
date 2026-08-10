import type { Alert } from './weather';

/**
 * Provider-agnostic weather alert helpers. Mapping a provider payload onto an `Alert` belongs to
 * that provider, not here.
 *
 * Kept free of any NativeScript import so the logic stays unit testable.
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

/** For the providers giving a color as separate channels. */
export function hexFromChannels(red: number, green: number, blue: number): string {
    return `#${[red, green, blue]
        .map((channel) =>
            Math.max(0, Math.min(255, Math.round(channel)))
                .toString(16)
                .padStart(2, '0')
        )
        .join('')}`;
}

export function sortAlerts(alerts: Alert[]): Alert[] {
    return alerts.sort((alert1, alert2) => (alert2.severity ?? AlertSeverity.UNKNOWN) - (alert1.severity ?? AlertSeverity.UNKNOWN) || alert1.start - alert2.start);
}
