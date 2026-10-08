<script lang="ts">
    import { titlecase } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { Color, Screen } from '@nativescript/core';
    import { formatDate, l, lc } from '~/helpers/locale';
    import type { Alert } from '~/services//providers/weather';
    import { colors, designStyle, windowInset } from '~/variables';
    import { alertStatus } from '~/utils/alertStatus';

    export let alerts: Alert[];
    // the sheet opens at its `peekHeight`; a full height content lets it expand up to the top while scrolling
    $: sheetHeight = Screen.mainScreen.heightDIPs - $windowInset.top;
    $: ({ colorOnSurfaceVariant, colorOutlineVariant, colorSurface } = $colors);
    $: modern = $designStyle === 'modern';
    const now = Date.now();
</script>

<!-- modern: styled from app/_modern.scss (modernSheet, modernCard, modernTile...) -->
<gesturerootview class={modern ? 'modernSheet' : ''} rows="auto,auto">
    {#if modern}
        <stacklayout padding="8 18 4 18">
            <absolutelayout class="modernSheetHandle" horizontalAlignment="center" />
            <label class="modernCardTitle" padding="10 0 0 0" text={alerts.length > 1 ? alerts.length + ' ' + l('alerts') : titlecase(l('alerts'))} />
        </stacklayout>
    {/if}
    <collectionview id="scrollView" height={sheetHeight} iosIgnoreSafeArea={true} items={alerts} row={1}>
        <Template let:item>
            {#if modern}
                <gridlayout class="modernCard" columns="auto,*" padding="12 14" rows="auto,auto,auto">
                    <label class="modernTile modernTileRound" color={item.color || '#EF9F27'} text="mdi-alert" verticalAlignment="top" verticalTextAlignment="center" />
                    <stacklayout col={1} marginLeft={12} verticalAlignment="center">
                        <label class="modernTitle modernStrong" text={item.event} textWrap={true} visibility={item.event ? 'visible' : 'collapse'} />
                        <label class="modernSubtitle" text={item.sender_name} visibility={item.sender_name ? 'visible' : 'collapse'} />
                    </stacklayout>
                    <!-- end time, then active (tinted with the alert color) or upcoming -->
                    <stacklayout colSpan={2} marginTop={10} orientation="horizontal" row={1}>
                        <label class="modernChip" text="{titlecase(l('expires'))}: {formatDate(item.end, 'dddd LT', item.timezoneOffset)}" />
                        {#if alertStatus(item, now) === 'active'}
                            <label
                                class="modernChip modernStrong"
                                backgroundColor={new Color(item.color || '#E24B4A').setAlpha(40).hex}
                                color={item.color || '#E24B4A'}
                                marginLeft={6}
                                text={lc('alert_active')} />
                        {:else}
                            <label class="modernChip" marginLeft={6} text={lc('alert_upcoming')} />
                        {/if}
                    </stacklayout>
                    <label class="modernSubtitle" colSpan={2} marginTop={8} row={2} text={item.description} textWrap={true} visibility={item.description?.length ? 'visible' : 'collapse'} />
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
