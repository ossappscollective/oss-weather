import { Align, Canvas, DashPathEffect, Paint, RectF, Style } from '@nativescript-community/ui-canvas';
import type { CombinedChart } from '@nativescript-community/ui-chart';
import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
import type { Color } from '@nativescript/core';
import { get } from 'svelte/store';
import { accentFontWeight } from '~/variables';
import { gridLineKind } from './chartLabels';
import { cardLeft, cardMetrics } from './highlightCard';

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

export interface HighlightCardRow {
    name: string;
    color: string | Color;
    text: string;
}

// card next to the highlight line: an optional title, then a dot, the name and the value of each row
export function drawHighlightCard(
    canvas: Canvas,
    chart: CombinedChart,
    {
        colors,
        lineX,
        rows,
        scale,
        title
    }: {
        lineX: number;
        title?: string;
        rows: HighlightCardRow[];
        scale: number;
        colors: { surface: string; border: string; text: string; textVariant: string };
    }
) {
    const fontWeight = get(accentFontWeight);
    cardTextPaint.setTextSize(12 * scale);
    cardTextPaint.setFontWeight('normal');
    const namesWidth = Math.max(...rows.map((row) => cardTextPaint.measureText(row.name)));
    cardTextPaint.setFontWeight(fontWeight);
    const valuesWidth = Math.max(...rows.map((row) => cardTextPaint.measureText(row.text)));
    // the title is drawn with the values weight
    const { dotSpace, height, lineHeight, padding, width } = cardMetrics({
        titleWidth: title ? cardTextPaint.measureText(title) : 0,
        namesWidth,
        valuesWidth,
        rowCount: rows.length,
        hasTitle: !!title,
        scale
    });
    const content = chart.viewPortHandler.contentRect;
    const left = cardLeft(lineX, width, content.left, content.right);
    const top = content.top + 8;
    cardPaint.setColor(colors.surface);
    canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, cardPaint);
    cardBorderPaint.setColor(colors.border);
    canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, cardBorderPaint);
    const baseline = lineHeight * 0.7;
    cardTextPaint.setTextAlign(Align.LEFT);
    if (title) {
        cardTextPaint.setColor(colors.text);
        canvas.drawText(title, left + padding, top + padding + baseline, cardTextPaint);
    }
    rows.forEach((row, index) => {
        const rowTop = top + padding + (index + (title ? 1 : 0)) * lineHeight;
        cardDotPaint.setColor(row.color);
        canvas.drawCircle(left + padding + 4 * scale, rowTop + lineHeight / 2, 4 * scale, cardDotPaint);
        cardTextPaint.setFontWeight('normal');
        cardTextPaint.setColor(colors.textVariant);
        cardTextPaint.setTextAlign(Align.LEFT);
        canvas.drawText(row.name, left + padding + dotSpace, rowTop + baseline, cardTextPaint);
        cardTextPaint.setFontWeight(fontWeight);
        cardTextPaint.setColor(colors.text);
        cardTextPaint.setTextAlign(Align.RIGHT);
        canvas.drawText(row.text, left + width - padding, rowTop + baseline, cardTextPaint);
    });
}
