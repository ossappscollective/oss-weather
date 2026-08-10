import { describe, expect, it } from 'vitest';
import { AlertSeverity, buildAccuAlerts, colorFromSeverity, normalizeOwmAlerts, sortAlerts } from './alerts';
import type { Alert } from './weather';

describe('normalizeOwmAlerts', () => {
    // One Call returns `start`/`end` as Unix seconds, the app works in milliseconds.
    const OWM_ALERT = {
        sender_name: 'Météo-France',
        event: 'Canicule',
        start: 1786380000,
        end: 1786410000,
        description: 'Vigilance orange canicule',
        tags: ['Extreme high temperature']
    };

    it('converts seconds to milliseconds', () => {
        const [alert] = normalizeOwmAlerts([OWM_ALERT]);
        expect(alert.start).toBe(1786380000000);
        expect(alert.end).toBe(1786410000000);
    });

    it('keeps the sender, event and description', () => {
        const [alert] = normalizeOwmAlerts([OWM_ALERT]);
        expect(alert.sender_name).toBe('Météo-France');
        expect(alert.event).toBe('Canicule');
        expect(alert.description).toBe('Vigilance orange canicule');
    });

    it('handles a missing alerts array', () => {
        expect(normalizeOwmAlerts(undefined)).toEqual([]);
    });
});

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

describe('colorFromSeverity', () => {
    it('uses a dense yellow, readable on both the light and the dark surface', () => {
        expect(colorFromSeverity(AlertSeverity.MODERATE)).toBe('#cbd600');
    });
});

describe('sortAlerts', () => {
    it('sorts by decreasing severity then by start time', () => {
        const alerts: Alert[] = [
            { event: 'moderate', start: 30, end: 40, severity: AlertSeverity.MODERATE },
            { event: 'extreme', start: 20, end: 40, severity: AlertSeverity.EXTREME },
            { event: 'severe-late', start: 20, end: 40, severity: AlertSeverity.SEVERE },
            { event: 'severe-early', start: 10, end: 40, severity: AlertSeverity.SEVERE }
        ];
        expect(sortAlerts(alerts).map((alert) => alert.event)).toEqual(['extreme', 'severe-early', 'severe-late', 'moderate']);
    });
});
