import { Canvas, Paint } from '@nativescript-community/ui-canvas';
import type { CommonData } from '~/services/weatherData';
import { ChipsLayout, layoutChips } from '~/utils/chipsLayout';
import { get } from 'svelte/store';
import { DesignStyle, cardBackgroundAlpha, dataTextStyle, tintAlpha } from '~/utils/designStyle';
import { isDarkTheme } from '~/helpers/theme';
import { dataIntensity } from '~/variables';
import { CHIP_HEIGHT, CHIP_PADDING, DataContentOptions, drawDataContent, measureDataContent } from '~/helpers/dataGrid';

const CHIP_GAP = 5;
const CHIP_ICON_GAP = 4;
const CHIP_ICON_SCALE = 0.95;

const backgroundPaint = new Paint();

export interface ChipsTheme {
    onSurface: string;
    onSurfaceVariant: string;
}

export interface PreparedChips {
    items: CommonData[];
    widths: number[];
    layout: ChipsLayout;
    height: number;
}

function contentOptions(item: CommonData, style: DesignStyle, theme: ChipsTheme, fontScale: number): DataContentOptions {
    return { iconScale: CHIP_ICON_SCALE, iconGap: CHIP_ICON_GAP, valueFontSize: dataTextStyle(style, item, theme, fontScale).valueFontSize };
}

function measureChip(item: CommonData, style: DesignStyle, theme: ChipsTheme, fontScale: number) {
    const textStyle = dataTextStyle(style, item, theme, fontScale);
    return 2 * CHIP_PADDING * fontScale + measureDataContent(item, textStyle.subvalueFontSize, contentOptions(item, style, theme, fontScale), fontScale);
}

export function prepareChips(items: CommonData[], maxWidth: number, style: DesignStyle, theme: ChipsTheme, fontScale: number, align: 'left' | 'center' | 'right' = 'left'): PreparedChips {
    const widths = items.map((item) => measureChip(item, style, theme, fontScale));
    const layout = layoutChips(widths, maxWidth, CHIP_GAP * fontScale, align);
    const height = layout.lineCount ? layout.lineCount * (CHIP_HEIGHT + CHIP_GAP) * fontScale - CHIP_GAP * fontScale : 0;
    return { items, widths, layout, height };
}

export function drawChips(canvas: Canvas, chips: PreparedChips, left: number, top: number, style: DesignStyle, theme: ChipsTheme, fontScale: number) {
    const chipHeight = CHIP_HEIGHT * fontScale;
    const showIntensity = get(dataIntensity);
    chips.items.forEach((item, index) => {
        const { line, x } = chips.layout.chips[index];
        const chipLeft = left + x;
        const chipTop = top + line * (CHIP_HEIGHT + CHIP_GAP) * fontScale;
        // a backgroundColor flags a warning (wind gust): it fills the chip and forces the text color
        const warningColor = item.backgroundColor ? item.customDrawColor : undefined;

        if (item.backgroundColor) {
            backgroundPaint.setColor(item.backgroundColor);
        } else if (showIntensity && item.tint) {
            backgroundPaint.setColor(item.tint.color);
            backgroundPaint.setAlpha(tintAlpha(item.tint.fraction, isDarkTheme()));
        } else {
            // a light tint of the text color, same as the cards: works over any background and theme
            backgroundPaint.setColor(theme.onSurface);
            backgroundPaint.setAlpha(cardBackgroundAlpha(isDarkTheme()));
        }
        canvas.drawRoundRect(chipLeft, chipTop, chipLeft + chips.widths[index], chipTop + chipHeight, chipHeight / 2, chipHeight / 2, backgroundPaint);
        drawDataContent(canvas, item, style, theme, contentOptions(item, style, theme, fontScale), chipLeft + CHIP_PADDING * fontScale, chipTop + chipHeight / 2, fontScale, warningColor);
    });
}
