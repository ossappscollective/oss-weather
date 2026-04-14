<script context="module" lang="ts">
    import { iconService } from '~/services/icon';
    import { conditionalEvent, createEventDispatcher } from '@shared/utils/svelte/ui';
    import { PROVIDER_PADDING } from '~/helpers/constants';
</script>

<script lang="ts">
    const dispatch = createEventDispatcher();
    export let isUserInteractionEnabled = true;
    export let iconData: [number, boolean];
    export let size: number = 40;
    // export let autoPlay = true;
    export let animated = false;
    let usingProvider = false;

    $: usingLottie = animated && iconService.usingLottie;
    let iconSrc: string;
    $: {
        if (iconData) {
            iconSrc = iconService.getIconPath(iconData[0], iconData[1], animated);
            usingProvider = iconService.usingProvider;
        } else {
            iconSrc = null;
        }
    }
</script>

{#if usingLottie}
    <lottie
        {...$$restProps}
        async={false}
        autoPlay={true}
        height={size}
        {isUserInteractionEnabled}
        loop={true}
        progress={0.5}
        src={iconSrc}
        width={size}
        use:conditionalEvent={{ condition: !!isUserInteractionEnabled, event: 'tap', callback: (event) => dispatch('tap', event) }} />
{:else}
    <image
        height={size - (usingProvider ? 2 * PROVIDER_PADDING : 0)}
        horizontalAlignment="center"
        {isUserInteractionEnabled}
        src={iconSrc}
        verticalAlignment="center"
        width={size - (usingProvider ? 2 * PROVIDER_PADDING : 0)}
        {...$$restProps}
        use:conditionalEvent={{ condition: !!isUserInteractionEnabled, event: 'tap', callback: (event) => dispatch('tap', event) }} />
{/if}
