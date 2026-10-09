<script context="module" lang="ts">
    import { Align, Canvas, Cap, Paint, Path, Style } from '@nativescript-community/ui-canvas';
    import { Color } from '@nativescript/core';

    const CURVE_COLOR = '#EF9F27';
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
        smallPaint.setTextSize(fontSize * 0.85);
        const curveTop = fontSize * 1.4;
        // curve band above the precipitation bars (at most half of the height)
        const curveBottom = height * 0.5;
        const points = shown.map((hour, index) => ({ x: columnWidth * (index + 0.5), y: curveBottom - (hour.curve ?? 0.5) * (curveBottom - curveTop) }));
        // precipitation like the app hourly item: rounded bars from the bottom, the amount at the bottom
        // and the probability above it, over the bars
        shown.forEach((hour, index) => {
            const left = columnWidth * index;
            (hour.precipBars ?? []).forEach((bar) => {
                const top = bar.top * (height - 10);
                const bottom = height - 3;
                const radius = Math.min(4, (bottom - top) / 2);
                // #rrggbbaa
                barPaint.setColor(bar.color.slice(0, 7));
                barPaint.setAlpha(parseInt(bar.color.slice(7, 9) || 'ff', 16));
                canvas.drawRoundRect(left + columnWidth * bar.start + 3, top, left + columnWidth * bar.end - 3, bottom, radius, radius, barPaint);
            });
            let deltaY = 6;
            if (hour.precipAmount) {
                smallPaint.setColor(color);
                smallPaint.setFontWeight('500');
                canvas.drawText(hour.precipAmount, points[index].x, height - deltaY, smallPaint);
                deltaY += 13;
            }
            if (hour.precipProbability) {
                smallPaint.setColor(toColor(color).setAlpha(150).hex);
                smallPaint.setFontWeight('normal');
                canvas.drawText(hour.precipProbability, points[index].x, height - deltaY, smallPaint);
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
