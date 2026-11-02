import { Align, Canvas, Cap, DashPathEffect, Paint, Rect, RectF, Style } from '@nativescript-community/ui-canvas';
import type { CombinedChart } from '@nativescript-community/ui-chart';
import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
import type { Color, ImageSource } from '@nativescript/core';
import { get } from 'svelte/store';
import { accentFontWeight } from '~/variables';
import { gridLineKind } from './chartLabels';
import { cardLayout, cardLeft, ellipsize } from './highlightCard';

// native drawing shared by the charts (not unit testable: it needs the canvas runtime), the
// computations live in chartLabels.ts and highlightCard.ts
export const MODERN_NIGHT_ALPHA = 12;
export const MODERN_NOW_COLOR = '#D85A30';

const nightPaint = new Paint();
const cardPaint = new Paint();
const cardBorderPaint = new Paint();
cardBorderPaint.setStyle(Style.STROKE);
cardBorderPaint.strokeWidth = 1;
const cardTextPaint = new Paint();
const cardDotPaint = new Paint();
const cardLegendPaint = new Paint();
cardLegendPaint.setStrokeCap(Cap.ROUND);
const gridLinePathEffect = new DashPathEffect([4, 8], 0);

// from the axis values, not between the grid lines: those only exist for the visible hours, so the
// partial hour at the edges would stay undrawn until a pan crosses an hour
export function drawNightShading(canvas: Canvas, chart: CombinedChart, ranges: { from: number; to: number }[], color: string) {
    const rect = chart.viewPortHandler.contentRect;
    nightPaint.setColor(color);
    nightPaint.setAlpha(MODERN_NIGHT_ALPHA);
    canvas.save();
    canvas.clipRect(rect.left, rect.top, rect.right, rect.bottom);
    for (const range of ranges) {
        const left = chart.getPixelForValues(range.from, 0, AxisDependency.LEFT).x;
        const right = chart.getPixelForValues(range.to, 0, AxisDependency.LEFT).x;
        canvas.drawRect(left, rect.top, right, rect.bottom, nightPaint);
    }
    canvas.restore();
}

// x axis renderer of the time charts: day separations (every 4 hours in classic) and multi-line labels.
// getHours gives the hour of the day, in the location time, of an axis value
export function createTimeAxisRenderer(getHours: (axisValue: number) => number, isModern: () => boolean) {
    return {
        drawGridLine(canvas: Canvas, axis, rect: RectF, x: number, y: number, axisValue: number, paint: Paint) {
            const kind = gridLineKind(getHours(axisValue), isModern());
            if (kind) {
                paint.setPathEffect(kind === 'solid' ? null : gridLinePathEffect);
                canvas.drawLine(x, rect.bottom, x, rect.top, paint);
            }
        },
        drawLabel(canvas: Canvas, axis, text: string, x: number, y: number, paint: Paint) {
            if (text) {
                const lines = text.split('\n');
                for (let index = 0; index < lines.length; index++) {
                    canvas.drawText(lines[index], x, y + index * paint.textSize, paint);
                }
            }
        }
    };
}

// mark at the left of a row telling how the value is drawn in the chart: a line (dashed or not) or a bar
export interface HighlightLegendMark {
    kind: 'line' | 'bar';
    color: string | Color;
    alpha?: number;
    width?: number;
    dash?: number[];
}

export interface HighlightCardRow {
    name: string;
    color: string | Color;
    text: string;
    // drawn instead of the color dot
    icon?: { glyph: string; paint: Paint; size: number; color: string | Color };
    legend?: HighlightLegendMark;
    // small text before the value
    extra?: string;
}

export interface HighlightCardContent {
    title?: string;
    subtitle?: string;
    image?: ImageSource;
    rows: HighlightCardRow[];
    // nominal row height, before the font scale
    rowHeight?: number;
}

export interface HighlightCardColors {
    surface: string;
    border: string;
    text: string;
    textVariant: string;
}

// card next to the highlight line: a header (title, subtitle, image), then the rows (dot or icon, name,
// value) in one or two columns depending on the plot height
export function drawHighlightCard(
    canvas: Canvas,
    chart: CombinedChart,
    { colors, image, lineX, rowHeight: nominalRowHeight = 18, rows, scale, subtitle, title }: HighlightCardContent & { lineX: number; scale: number; colors: HighlightCardColors }
) {
    if (!rows.length) {
        return;
    }
    const fontWeight = get(accentFontWeight);
    const content = chart.viewPortHandler.contentRect;
    const padding = 10 * scale;
    const gap = 12 * scale;
    const columnGap = 16 * scale;
    const hasLegend = rows.some((row) => !!row.legend);
    const hasIcon = rows.some((row) => !!row.icon);
    const legendSpace = hasLegend ? 8 * scale : 0;
    const leadingSpace = hasIcon ? 24 * scale : 14 * scale;
    cardTextPaint.setTextSize(12 * scale);
    cardTextPaint.setFontWeight('normal');
    const namesWidth = Math.max(...rows.map((row) => cardTextPaint.measureText(row.name)));
    const extrasWidth = Math.max(...rows.map((row) => (row.extra ? cardTextPaint.measureText(row.extra) + 6 * scale : 0)));
    cardTextPaint.setFontWeight(fontWeight);
    const valuesWidth = Math.max(...rows.map((row) => cardTextPaint.measureText(row.text)));
    const columnWidth = legendSpace + leadingSpace + namesWidth + gap + extrasWidth + valuesWidth;

    const imageSize = image ? 30 * scale : 0;
    const imageSpace = image ? imageSize + 8 * scale : 0;
    const titleHeight = title ? 18 * scale : 0;
    const subtitleHeight = subtitle ? 16 * scale : 0;
    const shownSubtitle = subtitle ? ellipsize(subtitle, Math.max(columnWidth, Math.min(content.width() * 0.8, 260 * scale)) - imageSpace, (text) => cardTextPaint.measureText(text)) : null;
    // the title is drawn with the values weight
    const titleWidth = title ? cardTextPaint.measureText(title) : 0;
    cardTextPaint.setFontWeight('normal');
    cardTextPaint.setTextSize(11 * scale);
    const subtitleWidth = shownSubtitle ? cardTextPaint.measureText(shownSubtitle) : 0;
    cardTextPaint.setTextSize(12 * scale);
    const hasHeader = !!(title || subtitle || image);
    const headerHeight = hasHeader ? Math.max(titleHeight + subtitleHeight, imageSize) + 4 * scale : 0;
    const layout = cardLayout({
        headerWidth: hasHeader ? Math.max(titleWidth, subtitleWidth) + imageSpace : 0,
        headerHeight,
        columnWidth,
        rowCount: rows.length,
        rowHeight: nominalRowHeight * scale,
        padding,
        columnGap,
        availableHeight: content.height() - 16
    });
    const { height, rowHeight, width } = layout;
    const left = cardLeft(lineX, width, content.left, content.right);
    const top = content.top + 8;
    cardPaint.setColor(colors.surface);
    canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, cardPaint);
    cardBorderPaint.setColor(colors.border);
    canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, cardBorderPaint);

    cardTextPaint.setTextAlign(Align.LEFT);
    if (title) {
        cardTextPaint.setFontWeight(fontWeight);
        cardTextPaint.setColor(colors.text);
        canvas.drawText(title, left + padding, top + padding + titleHeight * 0.7, cardTextPaint);
    }
    if (shownSubtitle) {
        cardTextPaint.setFontWeight('normal');
        cardTextPaint.setTextSize(11 * scale);
        cardTextPaint.setColor(colors.textVariant);
        canvas.drawText(shownSubtitle, left + padding, top + padding + titleHeight + subtitleHeight * 0.7, cardTextPaint);
        cardTextPaint.setTextSize(12 * scale);
    }
    if (image) {
        const imageLeft = left + width - padding - imageSize;
        canvas.drawBitmap(image, new Rect(0, 0, image.width, image.height), new RectF(imageLeft, top + padding, imageLeft + imageSize, top + padding + imageSize), null);
    }

    const columnLeftBase = left + padding;
    const rowsTop = top + padding + headerHeight;
    const baseline = rowHeight * 0.5 + 4 * scale;
    rows.forEach((row, index) => {
        const column = Math.floor(index / layout.rowsPerColumn);
        const columnLeft = columnLeftBase + column * (columnWidth + columnGap);
        const columnRight = columnLeft + columnWidth;
        const rowTop = rowsTop + (index % layout.rowsPerColumn) * rowHeight;
        const centerY = rowTop + rowHeight / 2;
        if (row.legend) {
            drawLegendMark(canvas, row.legend, columnLeft + 3 * scale, rowTop + 4 * scale, rowTop + rowHeight - 4 * scale, scale);
        }
        const leadingX = columnLeft + legendSpace;
        if (row.icon) {
            // the paint carries the icon font
            const iconPaint = row.icon.paint;
            iconPaint.setTextSize(Math.min(row.icon.size, rowHeight * 0.85));
            iconPaint.setColor(row.icon.color);
            iconPaint.setTextAlign(Align.CENTER);
            canvas.drawText(row.icon.glyph, leadingX + leadingSpace / 2 - 2 * scale, centerY + iconPaint.getTextSize() * 0.35, iconPaint);
        } else {
            cardDotPaint.setColor(row.color);
            canvas.drawCircle(leadingX + 4 * scale, centerY, 4 * scale, cardDotPaint);
        }
        cardTextPaint.setFontWeight('normal');
        cardTextPaint.setColor(colors.textVariant);
        cardTextPaint.setTextAlign(Align.LEFT);
        canvas.drawText(row.name, leadingX + leadingSpace, rowTop + baseline, cardTextPaint);
        cardTextPaint.setFontWeight(fontWeight);
        cardTextPaint.setColor(colors.text);
        cardTextPaint.setTextAlign(Align.RIGHT);
        canvas.drawText(row.text, columnRight, rowTop + baseline, cardTextPaint);
        if (row.extra) {
            const valueWidth = cardTextPaint.measureText(row.text);
            cardTextPaint.setFontWeight('normal');
            cardTextPaint.setColor(colors.textVariant);
            canvas.drawText(row.extra, columnRight - valueWidth - 6 * scale, rowTop + baseline, cardTextPaint);
        }
    });
}

function drawLegendMark(canvas: Canvas, mark: HighlightLegendMark, x: number, top: number, bottom: number, scale: number) {
    cardLegendPaint.setColor(mark.color);
    if (mark.kind === 'bar') {
        cardLegendPaint.setStyle(Style.FILL);
        cardLegendPaint.setAlpha(mark.alpha ?? 255);
        canvas.drawRoundRect(x - 2 * scale, top, x + 2 * scale, bottom, 2 * scale, 2 * scale, cardLegendPaint);
        return;
    }
    cardLegendPaint.setStyle(Style.STROKE);
    cardLegendPaint.setStrokeWidth(mark.width ?? 2);
    cardLegendPaint.setPathEffect(mark.dash ? new DashPathEffect(mark.dash, 0) : null);
    canvas.drawLine(x, top, x, bottom, cardLegendPaint);
}
