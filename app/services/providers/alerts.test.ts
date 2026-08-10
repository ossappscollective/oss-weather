import { describe, expect, it } from 'vitest';
import { AlertSeverity, colorFromSeverity, hexFromChannels, sortAlerts } from './alerts';
import type { Alert } from './weather';

describe('colorFromSeverity', () => {
    it('uses a dense yellow, readable on both the light and the dark surface', () => {
        expect(colorFromSeverity(AlertSeverity.MODERATE)).toBe('#cbd600');
    });
});

describe('hexFromChannels', () => {
    it('pads and clamps each channel', () => {
        expect(hexFromChannels(255, 184, 43)).toBe('#ffb82b');
        expect(hexFromChannels(0, 5, 300)).toBe('#0005ff');
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
