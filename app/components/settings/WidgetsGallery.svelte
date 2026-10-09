<script context="module" lang="ts">
    import { WIDGET_NAMES, WeatherWidgetData, WidgetConfig, WidgetConfigManager, WidgetDataManager } from 'plugin-widgets';
    import { onMount } from 'svelte';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { lc } from '~/helpers/locale';
    import { colors, windowInset } from '~/variables';
    import { Color } from '@nativescript/core';
    import { widgetBackground } from 'plugin-widgets/svelte/widgetBackground';

    interface GalleryWidget {
        name: string;
        component;
        config: WidgetConfig;
        sizes: { width: number; height: number }[];
    }
</script>

<script lang="ts">
    // debug: every widget preview at each of its preview sizes, with the live weather data
    $: ({ colorOnSurface, colorOnSurfaceVariant } = $colors);

    let widgets: GalleryWidget[] = [];
    let data: WeatherWidgetData = null;

    onMount(async () => {
        const names = Object.keys(WIDGET_NAMES);
        widgets = await Promise.all(
            names.map(async (name) => {
                const layout = (await import(`plugin-widgets/widgets/${name}.json`)).default;
                const component = (await import(`plugin-widgets/svelte/generated/${name}View.generated.svelte`)).default;
                // generated layouts read config.settings: like the widget settings page, it always exists
                const config = WidgetConfigManager.getKindConfig(name);
                return { name, component, config: { ...config, settings: config.settings ?? {} }, sizes: layout.preview?.sizes ?? [{ width: 160, height: 160 }] };
            })
        );
        try {
            data = await new WidgetDataManager().getWidgetWeatherData(widgets[0].config);
        } catch (error) {
            console.error('widgets gallery data', error);
        }
    });
</script>

<page actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,*">
        <scrollview row={1}>
            <stacklayout padding={`8 14 ${16 + $windowInset.bottom} 14`}>
                {#if data}
                    {#each widgets as widget}
                        <label color={colorOnSurface} fontSize={16} fontWeight="bold" marginTop={16} text={WIDGET_NAMES[widget.name]} />
                        {#each widget.sizes as size}
                            <label color={colorOnSurfaceVariant} fontSize={12} marginTop={8} text={`${widget.name} ${size.width}x${size.height}`} />
                            <!-- neutral backdrop, like a home screen -->
                            <gridlayout backgroundColor={new Color(colorOnSurface).setAlpha(20).hex} borderRadius={16} horizontalAlignment="left" marginTop={4} padding={12}>
                                <svelte:component this={widget.component} backgroundColor={widgetBackground()} config={widget.config} {data} {size} />
                            </gridlayout>
                        {/each}
                    {/each}
                {:else}
                    <activityindicator busy={true} marginTop={40} />
                {/if}
            </stacklayout>
        </scrollview>
        <CActionBar canGoBack title={lc('widgets_gallery')} />
    </gridlayout>
</page>
