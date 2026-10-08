<script lang="ts">
    import { titlecase } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { Color, Screen } from '@nativescript/core';
    import { formatDate, l } from '~/helpers/locale';
    import { isDarkTheme } from '~/helpers/theme';
    import type { Alert } from '~/services//providers/weather';
    import { cardBackgroundAlpha } from '~/utils/designStyle';
    import { accentFontWeight, colors, designStyle, fontScale, fonts, windowInset } from '~/variables';

    export let alerts: Alert[];
    // the sheet opens at its `peekHeight`; a full height content lets it expand up to the top while scrolling
    $: sheetHeight = Screen.mainScreen.heightDIPs - $windowInset.top;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface } = $colors);
    $: modern = $designStyle === 'modern';
    // modern: cards and tiles are a light tint of the text color
    $: cardColor = new Color(colorOnSurface).setAlpha(cardBackgroundAlpha(isDarkTheme())).hex;
    $: tileColor = new Color(colorOnSurface).setAlpha(2 * cardBackgroundAlpha(isDarkTheme())).hex;
</script>

<gesturerootview rows="auto,auto">
    {#if modern}
        <!-- drag handle and title -->
        <stacklayout padding="8 18 4 18">
            <absolutelayout backgroundColor={colorOutlineVariant} borderRadius={2} height={4} horizontalAlignment="center" width={36} />
            <label fontSize={16 * $fontScale} fontWeight={$accentFontWeight} marginTop={10} text={titlecase(l('alerts'))} />
        </stacklayout>
    {/if}
    <collectionview id="scrollView" height={sheetHeight} iosIgnoreSafeArea={true} items={alerts} row={1}>
        <Template let:item>
            {#if modern}
                <gridlayout backgroundColor={cardColor} borderRadius={14} columns="auto,*" margin="5 12 5 12" padding="12 14 12 14" rows="auto,auto,auto">
                    <label
                        backgroundColor={tileColor}
                        borderRadius={16 * $fontScale}
                        color={item.color || '#EF9F27'}
                        fontFamily={$fonts.mdi}
                        fontSize={17 * $fontScale}
                        height={32 * $fontScale}
                        text="mdi-alert"
                        textAlignment="center"
                        verticalAlignment="top"
                        verticalTextAlignment="center"
                        width={32 * $fontScale} />
                    <stacklayout col={1} marginLeft={12} verticalAlignment="center">
                        <label fontSize={15 * $fontScale} fontWeight={$accentFontWeight} text={item.event} textWrap={true} visibility={item.event ? 'visible' : 'collapse'} />
                        <label color={colorOnSurfaceVariant} fontSize={12 * $fontScale} text={item.sender_name} visibility={item.sender_name ? 'visible' : 'collapse'} />
                    </stacklayout>
                    <label
                        backgroundColor={tileColor}
                        borderRadius={12 * $fontScale}
                        colSpan={2}
                        fontSize={12 * $fontScale}
                        horizontalAlignment="left"
                        marginTop={10}
                        padding="3 10 3 10"
                        row={1}
                        text="{titlecase(l('expires'))}: {formatDate(item.end, 'dddd LT', item.timezoneOffset)}" />
                    <label
                        colSpan={2}
                        color={colorOnSurfaceVariant}
                        fontSize={13 * $fontScale}
                        lineHeight={18 * $fontScale}
                        marginTop={8}
                        row={2}
                        text={item.description}
                        textWrap={true}
                        visibility={item.description?.length ? 'visible' : 'collapse'} />
                </gridlayout>
            {:else}
                <gridlayout>
                    <gridlayout backgroundColor={colorSurface} borderRadius={20} columns="auto,*" margin={10} padding="10 0 10 0" rows="auto">
                        <label class="icon-btn" color={item.color || '#EFB644'} fontSize={36} marginLeft={10} text="mdi-alert" verticalAlignment="top" />
                        <label col={1} fontSize={14} padding="0 4 4 0" textWrap={true}>
                            <cspan fontSize={17} text={item.event} visibility={item.event ? 'visible' : 'hidden'} />
                            <cspan fontSize={17} text={'\n' + item.sender_name} visibility={item.sender_name ? 'visible' : 'hidden'} />
                            <cspan color={colorOnSurfaceVariant} text="{'\n' + titlecase(l('expires'))}: {formatDate(item.end, 'dddd LT', item.timezoneOffset)}" />
                            <cspan color={colorOutlineVariant} text={'\n' + item.description} visibility={item.description?.length ? 'visible' : 'hidden'} />
                        </label>
                    </gridlayout>
                </gridlayout>
            {/if}
        </Template>
    </collectionview>
</gesturerootview>
