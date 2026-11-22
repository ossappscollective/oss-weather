<script lang="ts">
    import { fonts } from '~/variables';

    export let icon: string;
    export let modern = false;
    export let color: string = undefined;
</script>

{#if modern}
    <!-- an undefined color would crash the native label -->
    <label {...$$restProps} {...color ? { color } : {}} class="modernTile themedIcon" marginRight={12} text={icon} verticalAlignment="center" verticalTextAlignment="center" />
{:else}
    <label {...$$restProps} class="themedIcon" fontFamily={$fonts.mdi} fontSize={24} padding="0 10 0 0" text={icon} verticalAlignment="center" />
{/if}
