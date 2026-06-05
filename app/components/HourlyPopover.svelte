<script lang="ts">
    import { Color } from '@akylas/nativescript';
    import { createNativeAttributedString } from '@nativescript-community/text';
    import { Align, Canvas, CanvasView, LayoutAlignment, Paint, StaticLayout } from '@nativescript-community/ui-canvas';
    import { closePopover } from '@nativescript-community/ui-popover/svelte';
    import { formatTime } from '~/helpers/locale';
    import { iconService } from '~/services/icon';
    import type { CommonWeatherData } from '~/services/providers/weather';
    import { CommonData, WeatherProps, weatherDataService } from '~/services/weatherData';
    import { colors, fontScale } from '~/variables';
    import WeatherIcon from './WeatherIcon.svelte';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { WeatherDataType } from '~/helpers/formatter';

    const labelPaint = new Paint();
    let canvas: NativeViewElementNode<CanvasView>;

    let { colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorSurfaceContainer } = $colors;
    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorSurfaceContainer } = $colors);
    export let item: CommonWeatherData;
    export let isUserInteractionEnabled: boolean = true;

    $: updateNativeTexts(item);
    let height;
    const animated = iconService.animated;

    let data: CommonData[];
    function updateNativeTexts(item: CommonWeatherData) {
        if (!item) {
            return;
        }
        data = weatherDataService.getAllIconsData({
            item,
            filter: [WeatherProps.windBeaufort, WeatherProps.precipAccumulation],
            addedBefore: [WeatherProps.temperature, WeatherProps.rainPrecipitation, WeatherProps.snowfall],
            addedAfter: [WeatherProps.rainSnowLimit, WeatherProps.iso],
            type: 'hourly'
        });
        height = data.length * 19 * $fontScale;
        canvas?.nativeView?.invalidate();
    }

    function onDraw({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        let dy = 0;

        const addedDy = 19;
        for (let index = 0; index < data.length; index++) {
            const c = data[index];
            const paint = c.paint || labelPaint;
            paint.color = c.iconColor || c.color || colorOnSurface;
            paint.textSize = c.iconFontSize * 0.8;
            paint.setTextAlign(Align.CENTER);
            canvas.drawText(c.icon || ' ', 10, dy + (addedDy - (__IOS__ ? 5 : 2)) * $fontScale, paint);

            const nativeText = createNativeAttributedString({
                spans: [
                    c.value !== undefined
                        ? {
                              fontSize: 14 * $fontScale,
                              //   verticalAlignment: 'center',
                              color: c.color || colorOnSurface,
                              text: c.value + (c.subvalue ? ' ' : '\n')
                          }
                        : undefined,
                    c.subvalue !== undefined
                        ? {
                              fontSize: 11 * $fontScale,
                              color: c.color || colorOnSurface,
                              //   verticalAlignment: 'center',
                              text: c.subvalue + '\n'
                          }
                        : undefined
                ].filter((s) => !!s)
            });
            canvas.save();
            const staticLayout = new StaticLayout(nativeText, labelPaint, w - 60 * $fontScale, LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
            canvas.translate(30 * $fontScale, dy);
            // const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, columnIndex === 0 ? LayoutAlignment.ALIGN_OPPOSITE : LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
            // canvas.translate(columnIndex === 0 ? w2 - lineWidth - 5 : w2 + 5, y + lineHeight / 2 - staticLayout.getHeight() / 2);
            staticLayout.draw(canvas);
            canvas.restore();

            dy += addedDy * $fontScale;
        }
    }
</script>

<gesturerootview columns="auto" rows="auto" {...$$restProps} on:tap>
    <gridlayout
        backgroundColor={new Color(colorBackground).setAlpha(240).hex}
        borderColor={colorOutline}
        borderRadius={__IOS__ ? 14 : 8}
        borderWidth={1}
        columns={`${100 * $fontScale},${50 * $fontScale}`}
        {isUserInteractionEnabled}
        padding={5}
        rows={`auto,auto,${height}`}
        on:tap={() => closePopover()}>
        <WeatherIcon {animated} col={1} iconData={[item.iconId, item.isDay]} {isUserInteractionEnabled} verticalAlignment="top" />
        <label colSpan={2} fontSize={14 * $fontScale} fontWeight="bold" text={formatTime(item.time, 'LT', item.timezoneOffset) + '\n' + formatTime(item.time, 'DD/MM', item.timezoneOffset)} />
        <label colSpan={2} fontSize={14 * $fontScale} marginBottom={10} row={1} text={item.description} />
        <!-- <label lineHeight={18 * $fontScale} row={1} text={iconsNativeString} textAlignment="center" verticalTextAlignment="center" /> -->
        <!-- <label col={1} lineHeight={18 * $fontScale} row={1} text={textNativeString} /> -->
        <canvasView bind:this={canvas} colSpan={2} row={2} on:draw={onDraw} />
    </gridlayout>
</gesturerootview>
