<script lang="ts">
    import { titlecase } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { Screen } from '@nativescript/core';
    import { formatDate, l } from '~/helpers/locale';
    import type { Alert } from '~/services//providers/weather';
    import { colors, windowInset } from '~/variables';

    export let alerts: Alert[];
    // the sheet opens at its `peekHeight`; a full height content lets it expand up to the top while scrolling
    $: sheetHeight = Screen.mainScreen.heightDIPs - $windowInset.top;
    $: ({ colorSurface, colorOnSurface, colorOnSurfaceVariant, colorPrimary, colorOutlineVariant } = $colors);
</script>

<gesturerootview rows="auto">
    <collectionview id="scrollView" height={sheetHeight} iosIgnoreSafeArea={true} items={alerts}>
        <Template let:item>
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
        </Template>
    </collectionview>
</gesturerootview>
