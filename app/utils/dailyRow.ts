// classic daily row: the header (day, date, temperatures) takes the top, small icons the bottom left
export const CHIPS_UNDER_HEADER_TOP = 40;
export const CHIPS_UNDER_HEADER_BOTTOM = 26;
const MIN_ROW_HEIGHT = 100;

export function classicDataRow(blockHeight: number, fontScale: number) {
    const rowHeight = Math.max(MIN_ROW_HEIGHT * fontScale, blockHeight + (CHIPS_UNDER_HEADER_TOP + CHIPS_UNDER_HEADER_BOTTOM) * fontScale);
    return { rowHeight, blockTop: Math.max(CHIPS_UNDER_HEADER_TOP * fontScale, (rowHeight - blockHeight) / 2) };
}

// icon, value and subvalue of the default layout, drawn from the block top
export const CLASSIC_DEFAULT_BLOCK_HEIGHT = 50;

// modern daily header: how many of the small icons, drawn in a row from `start`, end before `limit`
export function iconsFitting(widths: number[], start: number, limit: number): number {
    let right = start;
    let count = 0;
    for (const width of widths) {
        right += width;
        if (right > limit) {
            break;
        }
        count++;
    }
    return count;
}
