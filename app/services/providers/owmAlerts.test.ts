import { describe, expect, it } from 'vitest';
import { buildOwmAlerts } from './owmAlerts';

describe('buildOwmAlerts', () => {
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
        const [alert] = buildOwmAlerts([OWM_ALERT]);
        expect(alert.start).toBe(1786380000000);
        expect(alert.end).toBe(1786410000000);
    });

    it('keeps the sender, event and description', () => {
        const [alert] = buildOwmAlerts([OWM_ALERT]);
        expect(alert.sender_name).toBe('Météo-France');
        expect(alert.event).toBe('Canicule');
        expect(alert.description).toBe('Vigilance orange canicule');
    });

    it('handles a missing alerts array', () => {
        expect(buildOwmAlerts(undefined)).toEqual([]);
    });
});
