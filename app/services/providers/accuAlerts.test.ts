import { describe, expect, it } from 'vitest';
import { buildAccuAlerts } from './accuAlerts';
import { AlertSeverity } from './alerts';

describe('buildAccuAlerts', () => {
    const ACCU_ALERT = {
        AlertID: 1234,
        Description: { Localized: 'Heat Advisory', English: 'Heat Advisory' },
        Category: 'heat',
        Priority: 2,
        Color: { Red: 255, Green: 184, Blue: 43, Hex: 'FFB82B' },
        Source: 'Météo-France',
        SourceId: 8,
        Area: [{ EpochStartTime: 1786380000, EpochEndTime: 1786410000, Text: 'Stay hydrated.' }]
    };

    it('maps the AccuWeather payload onto the app alert', () => {
        const [alert] = buildAccuAlerts([ACCU_ALERT]);
        expect(alert.event).toBe('Heat Advisory');
        expect(alert.description).toBe('Stay hydrated.');
        expect(alert.sender_name).toBe('Météo-France');
        expect(alert.start).toBe(1786380000000);
        expect(alert.end).toBe(1786410000000);
        expect(alert.color).toBe('#ffb82b');
    });

    it('maps priority onto severity', () => {
        expect(buildAccuAlerts([{ ...ACCU_ALERT, Priority: 1 }])[0].severity).toBe(AlertSeverity.EXTREME);
        expect(buildAccuAlerts([{ ...ACCU_ALERT, Priority: 3 }])[0].severity).toBe(AlertSeverity.MODERATE);
        expect(buildAccuAlerts([{ ...ACCU_ALERT, Priority: 5 }])[0].severity).toBe(AlertSeverity.MINOR);
        expect(buildAccuAlerts([{ ...ACCU_ALERT, Priority: 9 }])[0].severity).toBe(AlertSeverity.UNKNOWN);
    });

    it('handles a missing result list', () => {
        expect(buildAccuAlerts(null)).toEqual([]);
    });
});
