import { describe, expect, it } from 'vitest';
import { AlertSeverity, colorFromSeverity } from './alerts';
import { MFWarningLabels, buildAlertsFromWarnings, buildOverseasAlerts, getMfDomain } from './mfWarnings';
import type { MFWarningDictionary, MFWarnings, MFWarningsOverseas } from './meteofrance';

// Fixtures follow the real `v3/warning/full` (metropolitan) and `v2/warning/full` (overseas)
// payloads, trimmed to what the mapping reads.
const NOW = 1786400000000;

const LABELS: MFWarningLabels = {
    phenomenon: (phenomenonId) => `phenomenon:${phenomenonId}`,
    level: (colorId) => `level:${colorId}`,
    consequencesTitle: 'Possible consequences',
    adviceTitle: 'Behavioral tips',
    bulletinTitle: 'Weather bulletin'
};

const BULLETIN_TEXT = {
    bloc_title: 'Bulletin de suivi départemental de la Vigilance : Hérault (34)',
    text_bloc_item: [
        {
            type_name: 'Situation météorologique',
            text_items: [
                {
                    type_code: 'SITUATION_ZON_SITUATION_MÉTÉOROLOGIQUE',
                    hazard_code: null,
                    term_items: [
                        {
                            term_names: 'J+J1',
                            risk_name: 'Orange',
                            subdivision_text: [{ underline_text: '', bold_text: 'Faits nouveaux :', text: ['Entrée en vigilance orange Canicule.'] }]
                        }
                    ]
                }
            ]
        },
        {
            type_name: 'Suivi par phénomène',
            text_items: [
                {
                    type_code: 'SUIVI_DEP_SUIVI_PHÉNOMÈNE_CA',
                    hazard_code: '6',
                    term_items: [
                        {
                            term_names: 'J+J1',
                            risk_name: 'Orange',
                            subdivision_text: [{ underline_text: '', bold_text: 'Qualification :', text: ['Épisode caniculaire durable.'] }]
                        }
                    ]
                }
            ]
        }
    ]
};

// Yellow department: MF returns null advices/consequences, the text is only in `text`.
const J0: MFWarnings = {
    update_time: 1786390000,
    end_validity_time: 1786410000,
    domain_id: '34',
    color_max: 2,
    timelaps: [
        { phenomenon_id: '6', timelaps_items: [{ begin_time: 1786380000, end_time: 1786410000, color_id: 2 }] },
        { phenomenon_id: '1', timelaps_items: [{ begin_time: 1786380000, end_time: 1786410000, color_id: 1 }] },
        { phenomenon_id: '3', timelaps_items: [{ begin_time: 1786300000, end_time: 1786390000, color_id: 3 }] }
    ],
    phenomenons_items: [],
    advices: null,
    consequences: null,
    comments: { title: 'Commentaire carte', text: ['Épisode caniculaire sur le sud-est.'] },
    text: BULLETIN_TEXT
};

// Tomorrow turns orange: advices/consequences are only populated from orange upwards.
const J1: MFWarnings = {
    update_time: 1786400500,
    end_validity_time: 1786496400,
    domain_id: '34',
    color_max: 3,
    timelaps: [
        {
            phenomenon_id: '6',
            timelaps_items: [
                { begin_time: 1786380000, end_time: 1786410000, color_id: 2 },
                { begin_time: 1786410000, end_time: 1786496400, color_id: 3 }
            ]
        }
    ],
    phenomenons_items: [],
    advices: [{ phenomenon_id: '6', phenomenon_max_color_id: 3, text_advice: '* Buvez de l’eau.<br>* Fermez les volets.' }],
    consequences: [{ phenomenon_id: '6', phenomenon_max_color_id: 3, text_consequence: '* Chacun est menacé.<br>* Danger accru.' }],
    comments: { title: 'Commentaire carte', text: ['Épisode caniculaire sur le sud-est.'] },
    text: BULLETIN_TEXT
};

describe('getMfDomain', () => {
    it('keeps metropolitan departments as-is', () => {
        expect(getMfDomain('34')).toBe('34');
        expect(getMfDomain('2A')).toBe('2A');
    });
    it('maps overseas territories to their VIGI domain', () => {
        expect(getMfDomain('974')).toBe('VIGI974');
        expect(getMfDomain('971')).toBe('VIGI971');
    });
    it('merges Saint-Barthélemy and Saint-Martin into a single domain', () => {
        expect(getMfDomain('977')).toBe('VIGI978-977');
        expect(getMfDomain('978')).toBe('VIGI978-977');
    });
    it('returns null for an unknown department', () => {
        expect(getMfDomain('99')).toBeNull();
        expect(getMfDomain('')).toBeNull();
    });
});

describe('buildAlertsFromWarnings', () => {
    it('drops green and expired vigilance', () => {
        const alerts = buildAlertsFromWarnings(J0, null, NOW, LABELS);
        expect(alerts.some((alert) => alert.event.includes('phenomenon:1'))).toBe(false);
        expect(alerts.some((alert) => alert.event.includes('phenomenon:3'))).toBe(false);
    });

    it('builds the yellow description from the bulletin text blocks', () => {
        const alerts = buildAlertsFromWarnings(J0, null, NOW, LABELS);
        const yellow = alerts.find((alert) => alert.event === 'phenomenon:6 - level:2');
        expect(yellow).toBeDefined();
        expect(yellow.description).toContain('Qualification :');
        expect(yellow.description).toContain('Épisode caniculaire durable.');
        expect(yellow.severity).toBe(AlertSeverity.MODERATE);
    });

    it('builds the orange description from consequences and advices, converting every <br>', () => {
        const alerts = buildAlertsFromWarnings(J0, J1, NOW, LABELS);
        const orange = alerts.find((alert) => alert.event === 'phenomenon:6 - level:3');
        expect(orange).toBeDefined();
        expect(orange.description).toContain('Possible consequences');
        expect(orange.description).toContain('Chacun est menacé.\n* Danger accru.');
        expect(orange.description).toContain('Behavioral tips');
        expect(orange.description).toContain('Buvez de l’eau.\n* Fermez les volets.');
        expect(orange.description).not.toContain('<br>');
        expect(orange.severity).toBe(AlertSeverity.SEVERE);
    });

    it('merges J0 and J1 without duplicating the shared vigilance', () => {
        const alerts = buildAlertsFromWarnings(J0, J1, NOW, LABELS);
        const shared = alerts.filter((alert) => alert.start === 1786380000000 && alert.event === 'phenomenon:6 - level:2');
        expect(shared).toHaveLength(1);
    });

    it('exposes the bulletin first, keeping the longest validity', () => {
        const alerts = buildAlertsFromWarnings(J0, J1, NOW, LABELS);
        expect(alerts[0].event).toBe(BULLETIN_TEXT.bloc_title);
        expect(alerts[0].severity).toBe(AlertSeverity.EXTREME);
        expect(alerts[0].description).toContain('Faits nouveaux :');
        expect(alerts[0].description).toContain('Entrée en vigilance orange Canicule.');
        expect(alerts[0].end).toBe(1786496400000);
        expect(alerts.filter((alert) => alert.event === BULLETIN_TEXT.bloc_title)).toHaveLength(1);
    });

    it('sorts the remaining alerts by decreasing severity', () => {
        const alerts = buildAlertsFromWarnings(J0, J1, NOW, LABELS);
        expect(alerts.map((alert) => alert.severity)).toEqual([AlertSeverity.EXTREME, AlertSeverity.SEVERE, AlertSeverity.MODERATE]);
    });
});

const OVERSEAS: MFWarningsOverseas = {
    update_time: 1786390000,
    end_validity_time: 1786410000,
    domain_id: 'VIGI974',
    color_max: 3,
    timelaps: [
        {
            phenomenon_id: 10,
            timelaps_items: [
                { begin_time: 1786380000, end_time: 1786410000, color_id: -1 },
                { begin_time: 1786380000, end_time: 1786410000, color_id: 3 }
            ]
        }
    ],
    advices: null,
    consequences: null,
    text: {
        begin_time: 1786362002,
        end_time: null,
        text_bloc_item: [{ title: 'Vagues-submersion', text: ['Pas de vigilance particulière.'] }]
    }
};

const DICTIONARY: MFWarningDictionary = {
    phenomenons: [
        { id: 10, name: 'Alerte Cyclonique' },
        { id: 9, name: 'Vagues-submersion' }
    ],
    colors: [
        { id: 1, level: 1, name: 'vert', hexaCode: '#28d761' },
        { id: 3, level: 3, name: 'orange hachuré', hexaCode: '#ff9900' }
    ]
};

describe('buildOverseasAlerts', () => {
    it('names phenomenons and levels from the dictionary', () => {
        const alerts = buildOverseasAlerts(OVERSEAS, DICTIONARY, NOW, LABELS);
        const cyclone = alerts.find((alert) => alert.event.startsWith('Alerte Cyclonique'));
        expect(cyclone).toBeDefined();
        expect(cyclone.event).toBe('Alerte Cyclonique - orange hachuré');
        // the app palette wins over the dictionary color so every provider stays consistent
        expect(cyclone.color).toBe(colorFromSeverity(AlertSeverity.SEVERE));
        expect(cyclone.severity).toBe(AlertSeverity.SEVERE);
    });

    it('drops the undefined (-1) vigilance', () => {
        const alerts = buildOverseasAlerts(OVERSEAS, DICTIONARY, NOW, LABELS);
        expect(alerts.filter((alert) => alert.event.startsWith('Alerte Cyclonique'))).toHaveLength(1);
    });

    it('exposes the overseas bulletin', () => {
        const alerts = buildOverseasAlerts(OVERSEAS, DICTIONARY, NOW, LABELS);
        expect(alerts[0].event).toBe(LABELS.bulletinTitle);
        expect(alerts[0].description).toContain('Vagues-submersion');
        expect(alerts[0].description).toContain('Pas de vigilance particulière.');
    });
});
