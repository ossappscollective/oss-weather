import { Align, Canvas, Paint } from '@nativescript-community/ui-canvas';

const CHIP_HEIGHT = 28;
const CHIP_PADDING = 10;
const DOT_RADIUS = 4;
const DOT_GAP = 6;
const SHOWN_ALPHA = 40;
const HIDDEN_ALPHA = 14;
const HIDDEN_TEXT_ALPHA = 120;

const chipPaint = new Paint();
const dotPaint = new Paint();
const textPaint = new Paint();
textPaint.setTextAlign(Align.LEFT);

export interface LegendEntry {
    name: string;
    subtitle?: string;
    color?: string;
    enabled: boolean;
}

// modern legend entry, drawn in a list cell: a chip with the series color dot, tinted with that
// color when the series is shown, faded when hidden
export function drawLegendChip(canvas: Canvas, legend: LegendEntry, onSurface: string, fontFamily: string, fontScale: number) {
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const color = legend.color || onSurface;
    const label = legend.subtitle ? `${legend.name} · ${legend.subtitle}` : legend.name;
    textPaint.setFontFamily(fontFamily);
    textPaint.setTextSize(12 * fontScale);
    const chipHeight = Math.min(CHIP_HEIGHT * fontScale, h - 6);
    const chipWidth = Math.min(w - 6, (2 * CHIP_PADDING + 2 * DOT_RADIUS + DOT_GAP) * fontScale + textPaint.measureText(label));
    const left = 3;
    const top = (h - chipHeight) / 2;
    const centerY = h / 2;

    chipPaint.setColor(legend.enabled ? color : onSurface);
    chipPaint.setAlpha(legend.enabled ? SHOWN_ALPHA : HIDDEN_ALPHA);
    canvas.drawRoundRect(left, top, left + chipWidth, top + chipHeight, chipHeight / 2, chipHeight / 2, chipPaint);

    const dotX = left + (CHIP_PADDING + DOT_RADIUS) * fontScale;
    dotPaint.setColor(legend.enabled ? color : onSurface);
    if (!legend.enabled) {
        dotPaint.setAlpha(HIDDEN_TEXT_ALPHA);
    }
    canvas.drawCircle(dotX, centerY, DOT_RADIUS * fontScale, dotPaint);

    textPaint.setColor(onSurface);
    if (!legend.enabled) {
        textPaint.setAlpha(HIDDEN_TEXT_ALPHA);
    }
    canvas.save();
    canvas.clipRect(left, top, left + chipWidth - CHIP_PADDING * fontScale, top + chipHeight);
    canvas.drawText(label, dotX + (DOT_RADIUS + DOT_GAP) * fontScale, centerY + 12 * fontScale * 0.35, textPaint);
    canvas.restore();
}
