<script context="module" lang="ts">
    import { Align, Canvas, Cap, Paint, Path, Style } from '@nativescript-community/ui-canvas';
    import { Color } from '@nativescript/core';

    const CURVE_COLOR = '#EF9F27';
    const PRECIP_FALLBACK = '#378ADD';
    const curvePaint = new Paint();
    curvePaint.setStyle(Style.STROKE);
    curvePaint.setStrokeWidth(3);
    curvePaint.setStrokeCap(Cap.ROUND);
    curvePaint.setColor(CURVE_COLOR);
    const textPaint = new Paint();
    textPaint.setTextAlign(Align.CENTER);
    textPaint.setFontWeight('500');
    const smallPaint = new Paint();
    smallPaint.setTextAlign(Align.CENTER);
    const barPaint = new Paint();
</script>

<script lang="ts">
    // in-app preview of the hourly chart (WidgetModern.HourlyChart on Android, WidgetHourlyChartView on iOS)
    import type { HourlyData } from '../WidgetTypes';
    const toColor = (value: string | Color) => (value instanceof Color ? value : new Color(value));

    export let hours: HourlyData[] = [];
    export let limit = 6;
    export let color: string | Color = '#1C1C1E';
    export let fontSize = 13;

    function onDraw({ canvas }: { canvas: Canvas }) {
        const shown = (hours ?? []).slice(0, limit);
        if (!shown.length) {
            return;
        }
        const width = canvas.getWidth();
        const height = canvas.getHeight();
        const columnWidth = width / shown.length;
        textPaint.setTextSize(fontSize);
        textPaint.setColor(color);
        smallPaint.setTextSize(fontSize * 0.8);
        const curveTop = fontSize * 1.4;
        const precipArea = smallPaint.textSize * 3.2;
        const curveBottom = height - precipArea;
        const points = shown.map((hour, index) => ({ x: columnWidth * (index + 0.5), y: curveBottom - (hour.curve ?? 0.5) * (curveBottom - curveTop) }));
        shown.forEach((hour, index) => {
            if (hour.precipFraction > 0) {
                const barHeight = (precipArea - smallPaint.textSize * 2.4) * Math.min(1, Math.max(0.15, hour.precipFraction));
                const bottom = height - smallPaint.textSize * 1.2;
                barPaint.setColor(hour.precipColor || PRECIP_FALLBACK);
                barPaint.setAlpha(110);
                canvas.drawRoundRect(points[index].x - columnWidth * 0.3, bottom - barHeight, points[index].x + columnWidth * 0.3, bottom, 3, 3, barPaint);
                smallPaint.setColor(hour.precipColor || PRECIP_FALLBACK);
                canvas.drawText(hour.precipAccumulation, points[index].x, bottom - barHeight - 2, smallPaint);
                smallPaint.setColor(toColor(color).setAlpha(150).hex);
                canvas.drawText(hour.precipitation, points[index].x, height - 2, smallPaint);
            }
        });
        const path = new Path();
        points.forEach((point, index) => {
            if (index === 0) {
                path.moveTo(0, point.y);
                path.lineTo(point.x, point.y);
            } else {
                const previous = points[index - 1];
                const middleX = (previous.x + point.x) / 2;
                path.cubicTo(middleX, previous.y, middleX, point.y, point.x, point.y);
            }
        });
        path.lineTo(width, points[points.length - 1].y);
        canvas.drawPath(path, curvePaint);
        shown.forEach((hour, index) => canvas.drawText(hour.temperature, points[index].x, points[index].y - 6, textPaint));
    }
</script>

<canvasview {...$$restProps} on:draw={onDraw} />
