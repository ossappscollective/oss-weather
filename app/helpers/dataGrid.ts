import { Align, Canvas, Paint } from '@nativescript-community/ui-canvas';
import type { Color } from '@nativescript/core';
import type { CommonData } from '~/services/weatherData';
import { centeredBaseline, gridColumnCount, layoutGrid } from '~/utils/dataGrid';
import { get } from 'svelte/store';
import { DesignStyle, dataTextStyle, textFontFamily, tintAlpha } from '~/utils/designStyle';
import { isDarkTheme } from '~/helpers/theme';
import { accentFontWeight, dataIntensity, designStyle } from '~/variables';
import { splitValueUnit } from '~/utils/valueUnit';

const ICON_SCALE = 1;
const ICON_GAP = 6;
const MISSING_ALPHA = 90;
const MISSING_TEXT = '–';
const UNIT_GAP = 2;
// chips size, also used by the grid intensity tint
export const CHIP_HEIGHT = 26;
export const CHIP_PADDING = 10;
const PROBABILITY_BAR_HEIGHT = 2.5;
const PROBABILITY_TRACK_ALPHA = 40;

const textPaint = new Paint();
textPaint.setTextAlign(Align.LEFT);
designStyle.subscribe((style) => textPaint.setFontFamily(textFontFamily(style)));
const barPaint = new Paint();
const tintPaint = new Paint();

// precipitation probability as a thin bar under the value: compact and readable at a glance
export function drawProbabilityBar(canvas: Canvas, left: number, right: number, top: number, probability: number, color: string | Color, fontScale: number) {
    const height = PROBABILITY_BAR_HEIGHT * fontScale;
    const radius = height / 2;
    barPaint.setColor(color);
    barPaint.setAlpha(PROBABILITY_TRACK_ALPHA);
    canvas.drawRoundRect(left, top, right, top + height, radius, radius, barPaint);
    barPaint.setColor(color);
    canvas.drawRoundRect(left, top, left + Math.max(height, ((right - left) * Math.min(100, probability)) / 100), top + height, radius, radius, barPaint);
}

// a value centered on x: amount in the accent weight, its unit regular
export function drawCenteredValue(canvas: Canvas, paint: Paint, value: string | number, x: number, y: number, fontScale: number) {
    const { amount, unit } = splitValueUnit(value);
    paint.setFontWeight(get(accentFontWeight));
    const amountWidth = paint.measureText(amount);
    paint.setFontWeight('normal');
    const unitLeft = amountWidth + (unit ? 2 * fontScale : 0);
    const left = x - (unitLeft + (unit ? paint.measureText(unit) : 0)) / 2;
    const align = paint.getTextAlign();
    paint.setTextAlign(Align.LEFT);
    if (unit) {
        canvas.drawText(unit, left + unitLeft, y, paint);
    }
    paint.setFontWeight(get(accentFontWeight));
    canvas.drawText(amount, left, y, paint);
    paint.setFontWeight('normal');
    paint.setTextAlign(align);
}

export interface GridTheme {
    onSurface: string;
    onSurfaceVariant: string;
}

export interface DataContentOptions {
    iconScale: number;
    iconGap: number;
    // already scaled
    valueFontSize: number;
}

// icon, amount (accent weight), then unit and extra text (regular, smaller): shared by chips and grid
function contentTexts(item: CommonData) {
    if (item.missing) {
        return { amount: MISSING_TEXT, smallText: '' };
    }
    const { amount, extra, unit } = item.value !== undefined && item.value !== null && item.value !== '' ? splitValueUnit(item.value, item.subvalue) : { amount: '', unit: '', extra: item.subvalue };
    // the probability is drawn as a bar, not repeated as text
    const smallText = [unit, item.probability === undefined ? extra : undefined].filter((text) => !!text).join(' ');
    return { amount, smallText };
}

export function measureDataContent(item: CommonData, subvalueFontSize: number, options: DataContentOptions, fontScale: number) {
    const { amount, smallText } = contentTexts(item);
    let width = 0;
    if (item.icon && item.paint) {
        item.paint.setTextSize(item.iconFontSize * options.iconScale);
        width += item.paint.measureText(item.icon) + (amount || smallText ? options.iconGap * fontScale : 0);
    }
    if (amount) {
        textPaint.setTextSize(options.valueFontSize);
        textPaint.setFontWeight(get(accentFontWeight));
        width += textPaint.measureText(amount) + (smallText ? UNIT_GAP * fontScale : 0);
        textPaint.setFontWeight('normal');
    }
    if (smallText) {
        textPaint.setTextSize(subvalueFontSize);
        width += textPaint.measureText(smallText);
    }
    return width;
}

export function drawDataContent(
    canvas: Canvas,
    item: CommonData,
    style: DesignStyle,
    theme: GridTheme,
    options: DataContentOptions,
    left: number,
    centerY: number,
    fontScale: number,
    // a warning (wind gust) forces the colors
    warningColor?: string | Color
) {
    const textStyle = dataTextStyle(style, item, theme, fontScale);
    const { amount, smallText } = contentTexts(item);
    const textBaseline = centerY + options.valueFontSize * 0.35;
    let textX = left;
    if (item.icon && item.paint) {
        item.paint.setTextAlign(Align.LEFT);
        item.paint.setTextSize(item.iconFontSize * options.iconScale);
        item.paint.setColor(item.missing ? theme.onSurfaceVariant : warningColor || textStyle.iconColor);
        if (item.missing) {
            item.paint.setAlpha(MISSING_ALPHA);
        }
        const metrics = item.paint.getFontMetrics();
        canvas.drawText(item.icon, textX, centeredBaseline(centerY, metrics.ascent, metrics.descent), item.paint);
        textX += item.paint.measureText(item.icon) + options.iconGap * fontScale;
    }
    const textLeft = textX;
    if (amount) {
        textPaint.setTextSize(options.valueFontSize);
        textPaint.setFontWeight(get(accentFontWeight));
        textPaint.setColor(item.missing ? theme.onSurfaceVariant : warningColor || textStyle.valueColor);
        if (item.missing) {
            textPaint.setAlpha(MISSING_ALPHA);
        }
        canvas.drawText(amount, textX, textBaseline, textPaint);
        textX += textPaint.measureText(amount) + (smallText ? UNIT_GAP * fontScale : 0);
        textPaint.setFontWeight('normal');
    }
    if (smallText) {
        textPaint.setTextSize(textStyle.subvalueFontSize);
        textPaint.setColor(warningColor || textStyle.subvalueColor);
        canvas.drawText(smallText, textX, textBaseline, textPaint);
        textX += textPaint.measureText(smallText);
    }
    if (item.probability !== undefined && !item.missing) {
        drawProbabilityBar(canvas, textLeft, textX, textBaseline + 3 * fontScale, item.probability, textStyle.iconColor, fontScale);
    }
}

export interface GridOptions {
    minCellWidth: number;
    maxColumns: number;
    rowHeight: number;
    rowGap: number;
    valueFontSize: number;
}

export interface PreparedGrid {
    items: CommonData[];
    cells: { column: number; row: number }[];
    cellWidth: number;
    options: GridOptions;
    height: number;
}

export function prepareGrid(items: CommonData[], width: number, options: GridOptions, fontScale: number): PreparedGrid {
    const columns = gridColumnCount(width, options.minCellWidth * fontScale, options.maxColumns);
    const { cells, rowCount } = layoutGrid(items.length, columns);
    const height = rowCount ? (rowCount * options.rowHeight + (rowCount - 1) * options.rowGap) * fontScale : 0;
    return { items, cells, cellWidth: width / columns, options, height };
}

export function drawGrid(canvas: Canvas, grid: PreparedGrid, left: number, top: number, style: DesignStyle, theme: GridTheme, fontScale: number) {
    const { cellWidth, options } = grid;
    const rowHeight = options.rowHeight * fontScale;
    const contentOptions = { iconScale: ICON_SCALE, iconGap: ICON_GAP, valueFontSize: options.valueFontSize * fontScale };
    const showIntensity = get(dataIntensity);
    grid.items.forEach((item, index) => {
        const { column, row } = grid.cells[index];
        const cellLeft = left + column * cellWidth;
        const centerY = top + row * (options.rowHeight + options.rowGap) * fontScale + rowHeight / 2;
        if (showIntensity && item.tint) {
            // same pill as a chip around the content, spilling left into the card padding so the content keeps its place
            const padding = CHIP_PADDING * fontScale;
            const contentWidth = measureDataContent(item, dataTextStyle(style, item, theme, fontScale).subvalueFontSize, contentOptions, fontScale);
            const tintRight = Math.min(cellLeft + contentWidth + padding, cellLeft + cellWidth - padding - 2 * fontScale);
            const chipHeight = CHIP_HEIGHT * fontScale;
            tintPaint.setColor(item.tint.color);
            tintPaint.setAlpha(tintAlpha(item.tint.fraction, isDarkTheme()));
            canvas.drawRoundRect(cellLeft - padding, centerY - chipHeight / 2, tintRight, centerY + chipHeight / 2, chipHeight / 2, chipHeight / 2, tintPaint);
        }
        canvas.save();
        canvas.clipRect(cellLeft, centerY - rowHeight / 2, cellLeft + cellWidth - 4 * fontScale, centerY + rowHeight / 2);
        drawDataContent(canvas, item, style, theme, contentOptions, cellLeft, centerY, fontScale);
        canvas.restore();
    });
}

export const TOP_GRID_OPTIONS: GridOptions = { minCellWidth: 100, maxColumns: 3, rowHeight: 24, rowGap: 10, valueFontSize: 15 };
export const DAILY_GRID_OPTIONS: GridOptions = { minCellWidth: 76, maxColumns: 4, rowHeight: 22, rowGap: 6, valueFontSize: 13 };
