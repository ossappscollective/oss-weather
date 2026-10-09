<script context="module" lang="ts">
    import { Paint } from '@nativescript-community/ui-canvas';
    const valuePaint = new Paint();
    valuePaint.setFontWeight('500');
    const unitPaint = new Paint();
    const CHIP_PADDING = 7;
    const ICON_GAP = 3;
</script>

<script lang="ts">
    // in-app preview of the modern weather data chips (WidgetModern.Chips on Android, WidgetChipsView on iOS)
    import { Color } from '@nativescript/core';
    import { packChips } from '~/utils/widgetChips';
    import type { WidgetChip } from '../WidgetTypes';
    const toColor = (value: string | Color) => (value instanceof Color ? value : new Color(value));

    export let chips: WidgetChip[] = [];
    export let color: string | Color = '#1C1C1E';
    export let fontSize = 12;
    export let iconSize = 14;
    export let chipSpacing = 4;
    export let limit = 4;
    export let maxWidth = 10000;
    export let maxRows = 1;

    // same width estimate as the native widgets: padding, icon, gap, value and unit
    function chipWidth(chip: WidgetChip) {
        valuePaint.setTextSize(fontSize);
        unitPaint.setTextSize(fontSize * 0.8);
        return 2 * CHIP_PADDING + iconSize + ICON_GAP + valuePaint.measureText(chip.value) + (chip.unit ? unitPaint.measureText(' ' + chip.unit) : 0);
    }
    $: shown = (chips ?? []).slice(0, limit);
    $: rows = packChips(shown.map(chipWidth), maxWidth, chipSpacing, maxRows);
    $: neutral = toColor(color).setAlpha(15).hex;
    $: chipHeight = Math.max(iconSize, fontSize * 1.2) + 4;
</script>

<stacklayout {...$$restProps}>
    {#each rows as row, rowIndex}
        <stacklayout horizontalAlignment="left" marginTop={rowIndex > 0 ? chipSpacing : 0} orientation="horizontal">
            {#each row as chipIndex, index}
                <gridlayout
                    backgroundColor={shown[chipIndex].tint || neutral}
                    borderRadius={(chipHeight + (shown[chipIndex].barFraction > 0 ? 3 : 0)) / 2}
                    columns="auto,auto"
                    marginLeft={index > 0 ? chipSpacing : 0}
                    padding={`2 ${CHIP_PADDING}`}
                    rows="auto">
                    <image height={iconSize} src={shown[chipIndex].iconPath} verticalAlignment="center" width={iconSize} />
                    <stacklayout col={1} marginLeft={ICON_GAP} verticalAlignment="center">
                        <label {color} {fontSize} maxLines={1}>
                            <cspan fontWeight="500" text={shown[chipIndex].value} />
                            <cspan color={toColor(color).setAlpha(150).hex} fontSize={fontSize * 0.8} text={shown[chipIndex].unit ? ' ' + shown[chipIndex].unit : null} />
                        </label>
                        {#if shown[chipIndex].barFraction > 0}
                            <absolutelayout
                                backgroundColor={shown[chipIndex].barColor || '#378ADD'}
                                borderRadius={1}
                                height={2}
                                horizontalAlignment="left"
                                width={Math.max(3, 24 * shown[chipIndex].barFraction)} />
                        {/if}
                    </stacklayout>
                </gridlayout>
            {/each}
        </stacklayout>
    {/each}
</stacklayout>
