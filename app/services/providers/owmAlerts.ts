import { AlertSeverity } from './alerts';
import type { Alert as OWMAlert } from './openweathermap';
import type { Alert } from './weather';

/**
 * One Call alert mapping. Kept out of `owm.ts` so it stays unit testable.
 *
 * One Call gives `start`/`end` in seconds and no severity.
 */
export function buildOwmAlerts(alerts: OWMAlert[]): Alert[] {
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
