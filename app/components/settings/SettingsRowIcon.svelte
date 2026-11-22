<script lang="ts">
    import { colors, fonts } from '~/variables';

    export let icon: string;
    export let modern = false;
    export let color: string = undefined;
    // an undefined color would crash the native label
    $: iconColor = color || $colors.colorOnBackground;
</script>

<label
    {...$$restProps}
    class={modern ? 'modernTile themedIcon' : 'themedIcon'}
    color={iconColor}
    fontFamily={$fonts.mdi}
    fontSize={modern ? 20 : 24}
    marginRight={modern ? 12 : 0}
    padding={modern ? '0' : '0 10 0 0'}
    text={icon}
    verticalAlignment="center"
    verticalTextAlignment="center" />
