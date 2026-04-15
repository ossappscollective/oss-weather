<script lang="ts">
    import type { ColorRamp } from '@maptiler/weather';

    export let expanded = false;
    export let snow = false;
    export let colorramp: ColorRamp;
</script>

<div id="info-popup" class="popup legend" class:legend-minimized={!expanded}>
    <button class={expanded ? 'legend__minimize-btn' : 'legend__info-btn'} title={expanded ? 'Minimize legend' : 'Legend Info'} type="button" on:click={() => (expanded = !expanded)}></button>
    <ul id="color-scheme-map" class={`color-s${parseInt(colorScheme, 10) - 1}`}>
        <li>
            <p class="precipitation-name">Rain</p>
            <div class="color-rain-gradient gradient"></div>
            <ul class="color-scheme">
                <li>
                    <div class="color-overcast"></div>
                    Overcast
                </li>
                <li>
                    <div class="color-drizzle"></div>
                    Drizzle
                </li>
                <li>
                    <div class="color-light-rain"></div>
                    Light rain
                </li>
                <li>
                    <div class="color-moderate-rain"></div>
                    Moderate rain
                </li>
                <li>
                    <div class="color-shower"></div>
                    Shower
                </li>
                <li>
                    <div class="color-hail"></div>
                    Hail
                </li>
            </ul>
        </li>
        {#if snow}
            <li>
                <p class="precipitation-name">Snow</p>
                <div class="color-snow-gradient gradient"></div>
                <ul class="color-scheme">
                    <li>
                        <div class="color-light-snow"></div>
                        Light
                    </li>
                    <li>
                        <div class="color-medium-snow"></div>
                        Moderate
                    </li>
                    <li>
                        <div class="color-heavy-snow"></div>
                        Heavy
                    </li>
                </ul>
            </li>
        {/if}
        <!---->
    </ul>
</div>
