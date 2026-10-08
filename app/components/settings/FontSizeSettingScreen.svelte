<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { TextField } from '@nativescript-community/ui-material-textfield';
    import { ApplicationSettings, PropertyChangeData } from '@nativescript/core';
    import { getNumber } from '@nativescript/core/application-settings';
    import { debounce } from '@nativescript/core/utils';
    import dayjs from 'dayjs';
    import WeatherComponent from '~/components/WeatherComponent.svelte';
    import { WeatherLocation, prepareItems } from '~/services/api';
    import type { WeatherData } from '~/services/providers/weather';
    import { accentFontWeight, colors, designStyle, windowInset } from '~/variables';
    import { styleModernSlider } from '~/utils/ui/modernSlider';
    import CActionBar from '../common/CActionBar.svelte';
    import { SETTINGS_FONTSCALE } from '~/helpers/constants';

    $: ({ colorOutline } = $colors);
    $: modern = $designStyle === 'modern';

    const weatherLocation: WeatherLocation = JSON.parse(
        '{"name":"Grenoble","sys":{"osm_id":80348,"osm_type":"R","extent":[5.6776059,45.2140762,5.7531176,45.1541442],"country":"France","osm_key":"place","osm_value":"city","name":"Grenoble","state":"Auvergne-Rhône-Alpes"},"coord":{"lat":45.1875602,"lon":5.7357819},"timezone":"Europe/Paris","timezoneOffset":1}'
    );
    const weatherData: WeatherData = JSON.parse(
        '{"time":1714123037544,"currently":{"time":1714122900000,"temperature":15.2,"usingFeelsLike":false,"windSpeed":15.8,"cloudCover":100,"isDay":true,"windBearing":221,"iconId":804,"description":"Cloudy","color":"#929292","moonPerc":165,"moonIcon":"","cloudColor":"#929292FE","windIcon":""},"daily":{"data":[{"time":1714089600000,"description":"Light rain shower","isDay":true,"iconId":520,"temperatureMax":17.4,"temperatureMin":9,"usingFeelsLike":false,"uvIndex":4,"windGust":48,"windSpeed":21,"windBearing":210,"precipProbability":100,"precipAccumulation":0.2,"precipColor":"#4681C3","precipIcon":"","color":"#FBC732","uvIndexColor":"#FFBC03","moonPerc":165,"moonIcon":"","windIcon":""},{"time":1714176000000,"description":"Cloudy","isDay":true,"iconId":804,"temperatureMax":22,"temperatureMin":9.5,"usingFeelsLike":false,"uvIndex":5,"windGust":54,"windSpeed":25,"windBearing":196,"precipProbability":17,"precipAccumulation":0,"color":"#FFC930","uvIndexColor":"#FFBC03","moonPerc":165,"moonIcon":"","windIcon":""}]},"minutely":{"data":[{"time":1714122900000,"intensity":0},{"time":1714123800000,"intensity":0},{"time":1714124700000,"intensity":0},{"time":1714125600000,"intensity":0}]},"alerts":[],"hourly":[{"time":1714122000000,"isDay":true,"iconId":804,"description":"Cloudy","temperature":15.1,"usingFeelsLike":false,"windBearing":222,"precipProbability":45,"snowfall":0,"rain":0,"precipAccumulation":0,"cloudCover":100,"windSpeed":14.5,"windGust":31.3,"snowDepth":0,"iso":1850,"color":"#929292","cloudColor":"#929292FE","windIcon":""},{"time":1714125600000,"isDay":true,"iconId":804,"description":"Cloudy","temperature":15.5,"usingFeelsLike":false,"windBearing":218,"precipProbability":63,"snowfall":0,"rain":0,"precipAccumulation":0,"cloudCover":100,"windSpeed":19.5,"windGust":41.8,"snowDepth":0,"iso":1870,"color":"#929292","cloudColor":"#929292FE","windIcon":""},{"time":1714129200000,"isDay":true,"iconId":500,"description":"Light rain","temperature":15,"usingFeelsLike":false,"windBearing":216,"precipProbability":82,"snowfall":0,"rain":0.1,"precipAccumulation":0.1,"cloudCover":100,"windSpeed":19.1,"windGust":47.9,"snowDepth":0,"iso":1820,"precipColor":"#4681C3","precipIcon":"","color":"#919192","cloudColor":"#929292FE","windIcon":""},{"time":1714132800000,"isDay":true,"iconId":520,"description":"Light rain shower","temperature":15.8,"usingFeelsLike":false,"windBearing":216,"precipProbability":100,"snowfall":0,"rain":0.1,"precipAccumulation":0.1,"cloudCover":100,"windSpeed":18.6,"windGust":41,"snowDepth":0,"iso":1930,"precipColor":"#4681C3","precipIcon":"","color":"#919192","cloudColor":"#929292FE","windIcon":""},{"time":1714136400000,"isDay":true,"iconId":804,"description":"Cloudy","temperature":16.8,"usingFeelsLike":false,"windBearing":215,"precipProbability":99,"snowfall":0,"rain":0,"precipAccumulation":0,"cloudCover":83,"windSpeed":18.9,"windGust":41,"snowDepth":0,"iso":1960,"color":"#A49B81","cloudColor":"#929292D3","windIcon":""},{"time":1714140000000,"isDay":true,"iconId":802,"description":"Partly cloudy","temperature":17.4,"usingFeelsLike":false,"windBearing":218,"precipProbability":98,"snowfall":0,"rain":0,"precipAccumulation":0,"cloudCover":73,"windSpeed":17.9,"windGust":40.3,"snowDepth":0,"iso":2000,"color":"#AFA077","cloudColor":"#929292BA","windIcon":""}]}'
    );

    const fakeNow = weatherData.currently.time;
    const items = prepareItems(weatherLocation, weatherData, weatherData.time, dayjs.utc(fakeNow));
    let fontScale = ApplicationSettings.getNumber(SETTINGS_FONTSCALE, 1);
    let resetCursorPosition = false;
    function setFontScale(value) {
        if (value !== fontScale) {
            resetCursorPosition = true;
            fontScale = Math.round(value * 1000) / 1000;
            ApplicationSettings.setNumber(SETTINGS_FONTSCALE, fontScale);
        }
    }

    const updateFonscale = debounce((value) => {
        const newValue = Math.max(Math.min(parseFloat(value), 2), 0.5);
        if (!isNaN(newValue)) {
            setFontScale(newValue);
        }
    }, 500);
    function onTextChange({ object, value }: PropertyChangeData<TextField>) {
        if (resetCursorPosition) {
            object.setSelection(value.length);
            resetCursorPosition = false;
        } else {
            updateFonscale(value);
        }
    }
</script>

<page actionBarHidden={true}>
    {#if modern}
        <!-- modern: the scale in a card (value, slider and its bounds), then the preview card, reset in the action bar -->
        <gridlayout class="pageContent" rows="auto,auto,auto,*" android:paddingBottom={$windowInset.bottom}>
            <gridlayout class="modernCard" columns="*,auto" padding="14" row={1} rows="auto,auto,auto">
                <label class="modernSubtitle" text={lc('font_scale')} verticalAlignment="bottom" />
                <label col={1} fontSize={22} fontWeight={$accentFontWeight} text={fontScale.toFixed(2)} />
                <slider colSpan={2} maxValue={2} minValue={0.5} row={1} value={fontScale} on:loaded={styleModernSlider} on:valueChange={(e) => setFontScale(e.value)} />
                <!-- 1 is at a third of the 0.5 - 2 range -->
                <gridlayout colSpan={2} columns="*,2*" padding="0 12" row={2}>
                    <label class="modernSubtitle" text="0.5" />
                    <label class="modernSubtitle" col={1} text="1" />
                    <label class="modernSubtitle" col={1} horizontalAlignment="right" text="2" />
                </gridlayout>
            </gridlayout>
            <label class="modernCaption" row={2} text={lc('preview')} />
            <gridlayout class="modernCard" row={3}>
                <WeatherComponent {fakeNow} fullRefresh={false} {items} {weatherLocation} />
            </gridlayout>
            <CActionBar title={lc('font_scale')}>
                <mdbutton class="modernButtonText" text={lc('reset')} variant="text" verticalAlignment="middle" on:tap={() => setFontScale(1)} />
            </CActionBar>
        </gridlayout>
    {:else}
        <gridlayout class="pageContent" rows="auto,auto,*" android:paddingBottom={$windowInset.bottom}>
            <gridlayout borderColor={colorOutline} borderRadius={10} borderWidth={1} margin="10" row={2}>
                <WeatherComponent {fakeNow} fullRefresh={false} {items} {weatherLocation} />
            </gridlayout>
            <gridlayout columns="*,auto,auto" row={1}>
                <slider maxValue={2} minValue={0.5} value={fontScale} on:valueChange={(e) => setFontScale(e.value)} />

                <textfield col={1} keyboardType="number" padding="4" text={fontScale.toFixed(2)} variant="outline" verticalTextAlignment="middle" width={70} on:textChange={onTextChange} />
                <mdbutton col={2} text={lc('reset')} variant="text" verticalAlignment="middle" on:tap={() => setFontScale(1)} />
            </gridlayout>
            <CActionBar title={lc('font_scale')} />
        </gridlayout>
    {/if}
</page>
