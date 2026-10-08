<!-- <svelte:options accessors /> -->

<script context="module" lang="ts">
    import { Paint } from '@nativescript-community/ui-canvas';
    import { colors, designStyle, fonts } from '~/variables';
    import { styleModernSlider } from '~/utils/ui/modernSlider';
</script>

<script lang="ts">
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorPrimary, colorSecondary } = $colors);

    export let icon: string = null;
    export let title: string = null;
    export let subtitle: string = null;
    export let min = 0;
    export let max = 1;
    export let step = null;
    export let value = 0;
    export let defaultValue = 0;
    export let onChange = null;
    export let formatter = (value) => value + '';
    export let valueFormatter = (value) => value.toFixed(1);
    // let canvas: NativeViewElementNode<CanvasView>;
    let actualValue;
    $: actualValue = value ?? defaultValue;
    function onValueChange(event) {
        value = event.value;
        onChange?.(event.value, event);
        // canvas?.nativeView.invalidate();
    }
    // function onDraw({ canvas, object }: { canvas: Canvas; object: CanvasView }) {
    //     try {
    //         const w = canvas.getWidth();
    //         const h = canvas.getHeight();
    //         let leftPadding = 10;
    //         const topPadding = 30;
    //         if (icon) {
    //             if (!iconPaint) {
    //                 iconPaint = new Paint();
    //                 iconPaint.textSize = 24;
    //                 iconPaint.fontFamily = $fonts.mdi;
    //             }
    //             iconPaint.color = colorOnSurface;
    //             canvas.drawText(icon, leftPadding, topPadding + 5, iconPaint);
    //             leftPadding += 40;
    //         }
    //         if (!textPaint) {
    //             textPaint = new Paint();
    //             textPaint.textSize = 15;
    //         }
    //         textPaint.color = colorOnSurface;
    //         textPaint.setTextAlign(Align.LEFT);

    //         if (title) {
    //             const staticLayout = new StaticLayout(title, textPaint, canvas.getWidth(), LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
    //             canvas.save();
    //             canvas.translate(leftPadding, topPadding);
    //             staticLayout.draw(canvas);
    //             canvas.restore();
    //             // canvas.drawText(title, leftPadding, topPadding, textPaint);
    //         }
    //         canvas.drawText(formatter(min), 10, h - 20, textPaint);
    //         textPaint.setTextAlign(Align.RIGHT);
    //         canvas.drawText(valueFormatter(value), w - 10, topPadding, textPaint);
    //         canvas.drawText(formatter(max), w - 10, h - 20, textPaint);
    //     } catch (err) {
    //         console.error(err, err.stack);
    //     }
    // }
</script>

<!-- modern: icon, title and value on one line, a thin accent slider below (colors from app/_modern.scss) -->
{#if $designStyle === 'modern'}
    <gridlayout {...$$restProps} class="modernSliderRow" columns="auto,*,auto" rows="auto,auto,auto">
        <label class="modernMenuIcon" text={icon} verticalAlignment="center" visibility={icon ? 'visible' : 'collapse'} />
        <label class="modernMenuTitle" col={1} text={title} textWrap={true} verticalAlignment="center" />
        <label class="modernSubtitle" col={1} row={1} text={subtitle} visibility={subtitle && subtitle.length > 0 ? 'visible' : 'collapse'} />
        <label class="modernMenuTitle modernStrong" col={2} marginLeft={8} text={valueFormatter(actualValue)} verticalAlignment="center" />
        <slider colSpan={3} maxValue={max} minValue={min} row={2} android:stepSize={step} value={actualValue} on:loaded={styleModernSlider} on:valueChange={onValueChange} />
    </gridlayout>
{:else}
    <gridlayout {...$$restProps} columns="auto,*,auto" padding="10 10 10 10" rows="auto,auto,auto">
        <!-- <canvasview bind:this={canvas} on:draw={onDraw} /> -->

        <label color={colorOnSurface} fontFamily={$fonts.mdi} fontSize={24} text={icon} verticalTextAlignment="center" visibility={icon ? 'visible' : 'collapse'} />
        <label col={1} color={colorOnSurface} fontSize={15} paddingLeft={10} text={title} textWrap={true} verticalTextAlignment="center" />
        <label
            col={1}
            color={colorOnSurfaceVariant}
            fontSize={14}
            paddingLeft={10}
            row={1}
            text={subtitle}
            verticalTextAlignment="center"
            visibility={subtitle && subtitle.length > 0 ? 'visible' : 'collapse'} />
        <label col={2} color={colorOnSurface} fontSize={15} text={valueFormatter(actualValue)} textAlignment="right" verticalTextAlignment="center" ios:margin={4} />
        <label col={2} color={colorOnSurface} fontSize={15} row={2} text={formatter(max)} textAlignment="right" verticalTextAlignment="center" />
        <label color={colorOnSurface} fontSize={15} row={2} text={formatter(min)} verticalTextAlignment="center" />
        <slider
            col={1}
            color={actualValue === defaultValue ? colorSecondary : colorPrimary}
            maxValue={max}
            minValue={min}
            row={2}
            android:stepSize={step}
            ios:margin={10}
            trackBackgroundColor="#aaaaaa88"
            value={actualValue}
            verticalAlignment="bottom"
            on:valueChange={onValueChange} />
    </gridlayout>
{/if}
