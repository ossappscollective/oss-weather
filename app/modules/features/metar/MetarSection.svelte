<script lang="ts">
    import ModernCardTitle from '~/components/common/ModernCardTitle.svelte';
    import type { WeatherLocation } from '~/services/api';
    import { WeatherProps } from '~/services/weatherData';
    import { designStyle } from '~/variables';
    import MetarChartView from './MetarChartView.svelte';
    import { fetchMetarReports } from './metar';
    import { MetarReport, MetarSeriesProp, metarSeries } from './report';

    export let weatherLocation: WeatherLocation;
    export let timezoneOffset: number;
    export let isCurrentDay: boolean;

    const METAR_CHARTS: { series: MetarSeriesProp; weatherProp: WeatherProps }[] = [
        { series: 'temperature', weatherProp: WeatherProps.temperature },
        { series: 'windSpeed', weatherProp: WeatherProps.windSpeed },
        { series: 'sealevelPressure', weatherProp: WeatherProps.sealevelPressure }
    ];
    let metarReports: MetarReport[] = [];
    $: modern = $designStyle === 'modern';
    $: metarCharts = METAR_CHARTS.map((chart) => ({ ...chart, points: metarSeries(metarReports, chart.series) })).filter((chart) => chart.points.length > 1);
    $: metarTitle = `METAR ${weatherLocation?.metarStation?.icao}`;

    // the page changes day in place: the reports follow the day shown
    $: loadReports(weatherLocation?.metarStation, isCurrentDay);

    async function loadReports(station: WeatherLocation['metarStation'], isToday: boolean) {
        metarReports = [];
        // the chart only shows on today's page
        if (!station || !isToday) {
            return;
        }
        try {
            const reports = await fetchMetarReports(station.icao, 24, 10000);
            if (station === weatherLocation?.metarStation) {
                metarReports = reports;
            }
        } catch (error) {
            // the observed charts are optional, nothing to show without them
            DEV_LOG && console.error('fetchMetarReports', error);
        }
    }
</script>

{#if isCurrentDay && metarCharts.length > 0}
    <stacklayout class={modern ? 'modernCard' : ''}>
        {#if modern}
            <ModernCardTitle icon="mdi-airplane" iconColor="#378ADD" title={metarTitle} />
        {:else}
            <label class="sectionHeader" paddingTop={10} text={metarTitle} />
        {/if}
        <MetarChartView series={metarCharts} {timezoneOffset} />
    </stacklayout>
{/if}
