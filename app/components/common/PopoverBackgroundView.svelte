<script context="module" lang="ts">
    import { colors, designStyle } from '~/variables';
</script>

<script lang="ts">
    let colorSurfaceContainer = $colors.colorSurfaceContainer;
    // technique for only specific properties to get updated on store change
    $: ({ colorSurfaceContainer } = $colors);
    export let backgroundColor = colorSurfaceContainer;
</script>

<!-- popovers are separate root views: they do not inherit the root font -->
<gesturerootview class={$designStyle === 'modern' ? 'ns-modern' : ''} columns="auto" rows="auto">
    <gridlayout {backgroundColor} borderRadius={$designStyle === 'modern' ? 16 : 10} elevation={4} margin={4} padding={$designStyle === 'modern' ? '4 14 4 14' : '0 10 0 10'} {...$$restProps}>
        <slot />
    </gridlayout>
</gesturerootview>
