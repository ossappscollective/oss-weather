<script context="module" lang="ts">
    import { Align, Canvas, CanvasView, FontMetrics, LayoutAlignment, Paint, Rect, StaticLayout } from '@nativescript-community/ui-canvas';
    import { ImageSource, ScrollView } from '@nativescript/core';
    import dayjs from 'dayjs';
    import { onDestroy } from 'svelte';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { formatDate, formatTime, getLocalTime, getStartOfDay, lc } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import { iconService } from '~/services/icon';
    import type { CommonWeatherData, WeatherData } from '~/services/providers/weather';
    import { colors, designStyle, fontScale } from '~/variables';
    import ModernCardTitle from '~/components/common/ModernCardTitle.svelte';

    const paint = new Paint();
    paint.setTextSize(13);

    const mFontMetricsBuffer = new FontMetrics();
    paint.getFontMetrics(mFontMetricsBuffer);
</script>

<script lang="ts">
    import { showError } from '@shared/utils/showError';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { loadImage } from '~/utils/utils.common';
    import { FavoriteLocation } from '~/helpers/favorites';
    import { PROVIDER_PADDING } from '~/helpers/constants';

    let { colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors;
    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors);

    interface Item {
        weatherData: { weatherData: WeatherData; model: { id: string; name: string; shortName: string; color: string } }[];
        forecast: string;
        chartType: 'linechart' | 'scatterchart';
        id: string;
        timestamp: number;
        hidden: string[];
    }
    const COLUMN_WIDTH = 40;
    const COLUMN_HEIGHT = 50;
    const ICON_SIZE = 30;
    export let item: Item;
    export let weatherLocation: FavoriteLocation;
    // export let screenOrientation: string = null;

    let width;
    let columns;

    let iconCache: { [k: string]: ImageSource } = {};
    function getIcon(iconId, isDay): ImageSource {
        const realIcon = iconService.getIconPath(iconId, isDay, false);
        if (!realIcon) {
            return null;
        }
        let icon = iconCache[realIcon];
        if (icon) {
            return icon;
        }
        icon = loadImage(realIcon, { resizeThreshold: 70 });
        if (icon && !realIcon.startsWith('android.resource://')) {
            iconCache[realIcon] = icon;
        }
        return icon;
    }
    onDestroy(() => {
        if (__ANDROID__) {
            Object.values(iconCache).forEach((item) => (item.android as android.graphics.Bitmap)?.recycle());
            iconCache = null;
        }
    });
    // modern: a wider model name column (names on one line next to their color dot)
    $: nameColumn = $designStyle === 'modern' ? 116 : 90;
    $: {
        columns = Math.max(...(item.forecast === 'daily' ? item.weatherData.map((w) => w.weatherData.daily.data.length) : item.weatherData.map((w) => w.weatherData.hourly.length)));
        width = columns * COLUMN_WIDTH + nameColumn;
    }
    $: height = item.weatherData.length * (COLUMN_HEIGHT + 6) + 30;

    $: if (item) {
        redraw();
    }
    // export let startingSide;

    let canvasView: NativeViewElementNode<CanvasView>;
    let headerScrollView: NativeViewElementNode<ScrollView>;

    function redraw() {
        canvasView?.nativeView.invalidate();
    }

    onThemeChanged(redraw);
    fontScale.subscribe(redraw);
    const srcRect = new Rect(0, 0, 0, 0);
    const dstRect = new Rect(0, 0, 0, 0);

    function drawWeatherItem(d: CommonWeatherData, canvas: Canvas, dx, dy) {
        const icon = getIcon(d.iconId, d.isDay);
        if (!icon) {
            return;
        }
        const padding = iconService.usingProvider ? PROVIDER_PADDING : 0;
        srcRect.set(0, 0, icon.width, icon.height);
        dstRect.set(
            dx + COLUMN_WIDTH / 2 - ICON_SIZE / 2 + padding,
            dy + COLUMN_HEIGHT / 2 - ICON_SIZE / 2 + padding,
            dx + COLUMN_WIDTH / 2 + ICON_SIZE / 2 - 2 * padding,
            dy + COLUMN_HEIGHT / 2 + ICON_SIZE / 2 - 2 * padding
        );
        // modern: icons only, like a table
        if ($designStyle !== 'modern') {
            paint.color = d.color;
            paint.setAlpha(150);
            canvas.drawRect(dx, dy, dx + COLUMN_WIDTH, dy + COLUMN_HEIGHT, paint);
        }
        canvas.drawBitmap(icon, srcRect, dstRect, null);
    }
    function onDraw({ canvas }: { canvas: Canvas }) {
        let dy = 0;
        const now = getLocalTime(undefined, weatherLocation.timezoneOffset);
        const startOfHour = now.startOf('h');
        const startOfHourTimeStamp = startOfHour.valueOf();
        const startOfDayTimeStamp = getStartOfDay(now, weatherLocation.timezoneOffset).valueOf();
        // const startOfDayTimeStamp = startOfDay.valueOf();
        paint.setTextAlign(Align.LEFT);
        item.weatherData.forEach((data) => {
            let dx = nameColumn;
            paint.setAlpha(255);
            paint.color = data.model.color;
            // modern: a color dot and the model name in the secondary color
            const modern = $designStyle === 'modern';
            const nameLeft = modern ? 22 : 8;
            paint.setTextSize(modern ? 12 : 13);
            if (modern) {
                canvas.drawCircle(12, dy + COLUMN_HEIGHT / 2, 4, paint);
                paint.color = colorOnSurfaceVariant;
            } else {
                canvas.drawRect(0, dy, 6, dy + COLUMN_HEIGHT, paint);
            }
            const name = data.model.name.replace(': ', '\n');
            const staticLayout = new StaticLayout(name, paint, dx - nameLeft, LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
            canvas.save();
            canvas.translate(nameLeft, dy + COLUMN_HEIGHT / 2 - staticLayout.getHeight() / 2);
            staticLayout.draw(canvas);
            canvas.restore();
            let lastTimestamp;

            if (item.forecast === 'hourly') {
                data.weatherData.hourly.forEach((d) => {
                    if (d.time >= startOfHourTimeStamp) {
                        const deltaHours = lastTimestamp ? Math.round((d.time - lastTimestamp) / 3600000) : -1;
                        if (deltaHours > 1) {
                            dx += COLUMN_WIDTH * (deltaHours - 1);
                        }
                        drawWeatherItem(d, canvas, dx, dy);
                        dx += COLUMN_WIDTH;
                        lastTimestamp = d.time;
                    }
                });
            } else {
                data.weatherData.daily.data.forEach((d) => {
                    if (d.time >= startOfDayTimeStamp) {
                        const deltaDays = lastTimestamp ? Math.round((d.time - lastTimestamp) / (24 * 3600000)) : -1;
                        if (deltaDays > 1) {
                            dx += COLUMN_WIDTH * (deltaDays - 1);
                        }
                        drawWeatherItem(d, canvas, dx, dy);
                        dx += COLUMN_WIDTH;
                        lastTimestamp = d.time;
                    }
                });
            }
            dy += COLUMN_HEIGHT + 6;
        });
    }
    function onDrawHeader({ canvas }: { canvas: Canvas }) {
        try {
            const w = canvas.getWidth();
            const h = canvas.getHeight();
            const dy = h - 5;
            let dx = nameColumn;
            const now = getLocalTime(undefined, weatherLocation.timezoneOffset);
            const startOfHour = now.startOf('h');
            const startOfDay = getStartOfDay(now, weatherLocation.timezoneOffset);
            paint.setTextAlign(Align.CENTER);
            paint.setColor($designStyle === 'modern' ? colorOnSurfaceVariant : colorOnSurface);
            if (item.forecast === 'hourly') {
                for (let index = 0; index < columns; index++) {
                    const date = startOfHour.add(index + 1, 'h');
                    canvas.drawText(formatTime(date.valueOf(), date.get('h') === 0 ? 'ddd' : 'HH', weatherLocation.timezoneOffset), dx + COLUMN_WIDTH / 2, dy, paint);
                    dx += COLUMN_WIDTH;
                }
            } else {
                for (let index = 0; index < columns; index++) {
                    const date = startOfDay.add(index + 1, 'd');
                    canvas.drawText(formatDate(date.valueOf(), 'DD/MM', weatherLocation.timezoneOffset), dx + COLUMN_WIDTH / 2, dy, paint);
                    dx += COLUMN_WIDTH;
                }
            }
        } catch (error) {
            showError(error);
        }
    }
    function onScroll(event) {
        headerScrollView.nativeView.scrollToHorizontalOffset(event.scrollOffset, false);
    }
</script>

<gridlayout rows="auto,auto,*" {...$$restProps}>
    {#if $designStyle === 'modern'}
        <ModernCardTitle icon="mdi-weather-partly-cloudy" iconColor="#888780" title={lc('conditions_by_model')} />
    {:else}
        <label class="sectionHeader" paddingTop={10} text={`${item.id} (${lc(item.forecast)})`} />
    {/if}
    <scrollview bind:this={headerScrollView} height={30} isUserInteractionEnabled={false} orientation="horizontal" row={1} scrollBarIndicatorVisible={false}>
        <canvasview height="100%" horizontalAlignment="left" {width} on:draw={onDrawHeader} />
    </scrollview>
    <collectionview items={[item]} row={2} rowHeight={height}>
        <Template let:item>
            <gridlayout>
                <collectionview colWidth={width} items={[item]} orientation="horizontal" on:scroll={onScroll}>
                    <Template let:item>
                        <canvasview bind:this={canvasView} {height} {width} on:draw={onDraw} />
                    </Template>
                </collectionview>
            </gridlayout>
        </Template>
    </collectionview>
</gridlayout>
