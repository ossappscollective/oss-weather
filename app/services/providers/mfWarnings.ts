import { AlertSeverity, colorFromSeverity, sortAlerts } from './alerts';
import type { MFWarningDictionary, MFWarningText, MFWarnings, MFWarningsOverseas } from './meteofrance';
import type { Alert } from './weather';

/**
 * Météo France vigilance mapping.
 *
 * Kept free of any NativeScript import so it stays unit testable: the localized labels are
 * injected by the provider.
 */

export interface MFWarningLabels {
    phenomenon(phenomenonId: string): string;
    level(colorId: number): string;
    consequencesTitle: string;
    adviceTitle: string;
    bulletinTitle: string;
}

/** Metropolitan vigilance level: 1 green, 2 yellow, 3 orange, 4 red. */
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

/** Overseas territories are not served by `v3/warning/full`, they have their own `VIGI*` domain. */
const OVERSEAS_TERRITORIES = ['971', '972', '973', '974', '975', '976', '977', '978', '986', '987', '988'];

const METROPOLITAN_DEPARTMENT = /^(?:0[1-9]|[1-8]\d|9[0-5]|2[AB])$/;

export function getMfDomain(frenchDepartment: string): string {
    if (!frenchDepartment) {
        return null;
    }
    if (METROPOLITAN_DEPARTMENT.test(frenchDepartment)) {
        return frenchDepartment;
    }
    if (OVERSEAS_TERRITORIES.includes(frenchDepartment)) {
        // Saint-Barthélemy and Saint-Martin share a single bulletin
        return frenchDepartment === '977' || frenchDepartment === '978' ? 'VIGI978-977' : `VIGI${frenchDepartment}`;
    }
    return null;
}

function cleanupText(text: string): string {
    return text?.replace(/<br\s*\/?>/gi, '\n').trim();
}

function appendSection(content: string[], title: string, text: string) {
    const cleaned = cleanupText(text);
    if (cleaned?.length) {
        content.push(title ? `${title}:\n${cleaned}` : cleaned);
    }
}

/**
 * Bulletin text blocks, filtered on the phenomenon they describe. `hazard_code` is `null` on the
 * general situation blocks, which is what the overall bulletin uses.
 */
function getTextBlocsContent(text: MFWarningText, phenomenonId: string): string[] {
    const content: string[] = [];
    text?.text_bloc_item?.forEach((blocItem) => {
        const textItems = blocItem.text_items?.filter((textItem) => (textItem.hazard_code ?? null) === phenomenonId);
        if (!textItems?.length) {
            return;
        }
        const blocContent: string[] = [];
        textItems.forEach((textItem) => {
            textItem.term_items?.forEach((termItem) => {
                termItem.subdivision_text?.forEach((subdivision) => {
                    const parts: string[] = [];
                    if (subdivision.underline_text?.length) {
                        parts.push(subdivision.underline_text);
                    }
                    if (subdivision.bold_text?.length) {
                        parts.push(subdivision.bold_text);
                    }
                    if (subdivision.text?.length) {
                        parts.push(subdivision.text.join('\n'));
                    }
                    if (parts.length) {
                        blocContent.push(parts.join(' '));
                    }
                });
            });
        });
        if (blocContent.length) {
            content.push(blocItem.type_name?.length ? `${blocItem.type_name}:\n${blocContent.join('\n\n')}` : blocContent.join('\n\n'));
        }
    });
    return content;
}

/**
 * MF only fills `consequences`/`advices` from the orange level upwards, the yellow ones only have
 * the bulletin text blocks — so both sources are used.
 */
function getWarningContent(phenomenonId: string, warnings: MFWarnings, labels: MFWarningLabels): string {
    const content = getTextBlocsContent(warnings.text, phenomenonId);
    appendSection(content, labels.consequencesTitle, warnings.consequences?.find((it) => it.phenomenon_id === phenomenonId)?.text_consequence);
    appendSection(content, labels.adviceTitle, warnings.advices?.find((it) => it.phenomenon_id === phenomenonId)?.text_advice);
    return content.length ? content.join('\n\n') : null;
}

/** The overall vigilance bulletin: the text blocks that are not tied to a phenomenon. */
function getBulletinAlert(warnings: MFWarnings, labels: MFWarningLabels): Alert {
    if (!warnings?.text) {
        return null;
    }
    const description = getWarningContent(null, warnings, labels);
    if (!description) {
        return null;
    }
    return {
        start: warnings.update_time * 1000,
        end: warnings.end_validity_time * 1000,
        event: warnings.text.bloc_title?.length ? warnings.text.bloc_title : labels.bulletinTitle,
        description,
        // shown first: it summarizes every phenomenon, so it carries no vigilance color of its own
        severity: AlertSeverity.EXTREME,
        color: null
    };
}

function getPhenomenonAlerts(warnings: MFWarnings, labels: MFWarningLabels): Alert[] {
    if (!warnings?.timelaps) {
        return [];
    }
    return warnings.timelaps.reduce((acc, timelaps) => {
        timelaps.timelaps_items
            ?.filter((item) => item.color_id > 1)
            .forEach((item) => {
                const severity = severityFromVigilanceColorId(item.color_id);
                acc.push({
                    start: item.begin_time * 1000,
                    end: item.end_time * 1000,
                    event: `${labels.phenomenon(timelaps.phenomenon_id)} - ${labels.level(item.color_id)}`,
                    description: getWarningContent(timelaps.phenomenon_id, warnings, labels),
                    severity,
                    color: colorFromSeverity(severity)
                });
            });
        return acc;
    }, [] as Alert[]);
}

/**
 * The same vigilance is published on both the J0 and the J1 bulletin, with a text that gets richer
 * as the level rises. Alerts sharing an event over overlapping periods are merged into a single one
 * covering the whole period, keeping the most detailed text.
 */
function dedupeAlerts(alerts: Alert[]): Alert[] {
    const merged: Alert[] = [];
    alerts.forEach((alert) => {
        const existing = merged.find((candidate) => candidate.event === alert.event && alert.start <= candidate.end && alert.end >= candidate.start);
        if (existing) {
            existing.start = Math.min(existing.start, alert.start);
            existing.end = Math.max(existing.end, alert.end);
            if ((alert.description?.length ?? 0) > (existing.description?.length ?? 0)) {
                existing.description = alert.description;
            }
            return;
        }
        merged.push({ ...alert });
    });
    return merged;
}

/**
 * @param today `v3/warning/full` for `echeance=J0`
 * @param tomorrow same for `echeance=J1`, `null` when it is not published yet
 */
export function buildAlertsFromWarnings(today: MFWarnings, tomorrow: MFWarnings, now: number, labels: MFWarningLabels): Alert[] {
    const alerts = [today, tomorrow]
        .filter((warnings) => !!warnings)
        .reduce((acc, warnings) => {
            const bulletin = getBulletinAlert(warnings, labels);
            if (bulletin) {
                acc.push(bulletin);
            }
            return acc.concat(getPhenomenonAlerts(warnings, labels));
        }, [] as Alert[]);
    return sortAlerts(dedupeAlerts(alerts).filter((alert) => alert.end > now));
}

function getOverseasBulletinAlert(warnings: MFWarningsOverseas, labels: MFWarningLabels): Alert {
    const blocItems = warnings?.text?.text_bloc_item;
    // unlike the metropolitan bulletin, the overseas one is always published, even when every
    // phenomenon is green — only show it once something is actually going on
    if (!blocItems?.length || !(warnings.color_max > 1)) {
        return null;
    }
    const description = blocItems
        .map((blocItem) => [blocItem.title, blocItem.text?.join('\n')].filter((part) => part?.length).join('\n'))
        .filter((part) => part.length)
        .join('\n\n');
    if (!description.length) {
        return null;
    }
    return {
        start: warnings.text.begin_time * 1000,
        end: (warnings.text.end_time ?? warnings.end_validity_time) * 1000,
        event: labels.bulletinTitle,
        description: cleanupText(description),
        severity: AlertSeverity.EXTREME,
        color: null
    };
}

export function buildOverseasAlerts(warnings: MFWarningsOverseas, dictionary: MFWarningDictionary, now: number, labels: MFWarningLabels): Alert[] {
    if (!warnings) {
        return [];
    }
    const alerts: Alert[] = [];
    const bulletin = getOverseasBulletinAlert(warnings, labels);
    if (bulletin) {
        alerts.push(bulletin);
    }
    warnings.timelaps?.forEach((timelaps) => {
        const phenomenonName = dictionary?.phenomenons?.find((phenomenon) => phenomenon.id === timelaps.phenomenon_id)?.name ?? labels.phenomenon(`${timelaps.phenomenon_id}`);
        timelaps.timelaps_items
            ?.filter((item) => item.color_id > 1)
            .forEach((item) => {
                const color = dictionary?.colors?.find((dictionaryColor) => dictionaryColor.id === item.color_id);
                const severity = color ? severityFromColorName(color.name) : severityFromVigilanceColorId(item.color_id);
                alerts.push({
                    start: item.begin_time * 1000,
                    end: item.end_time * 1000,
                    event: `${phenomenonName} - ${color?.name ?? labels.level(item.color_id)}`,
                    description: cleanupText(warnings.consequences?.find((it) => it.phenomenon_id === timelaps.phenomenon_id)?.text_consequence),
                    severity,
                    // the app palette wins over the dictionary color so every provider stays consistent
                    color: colorFromSeverity(severity) ?? color?.hexaCode
                });
            });
    });
    return sortAlerts(dedupeAlerts(alerts).filter((alert) => alert.end > now));
}
