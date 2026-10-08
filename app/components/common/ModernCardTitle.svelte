<script lang="ts">
    import { fontScale, fonts } from '~/variables';
    // modern card header: colored icon and title in one label, an optional right part (slot, col 2)
    export let icon: string = null;
    export let iconColor: string = null;
    // data icons use their own font (wd, wi...)
    export let iconFontFamily: string = null;
    export let title: string;
</script>

<gridlayout class="modernCardHeader" columns="auto,*,auto" {...$$restProps}>
    <label class="modernCardTitle" colSpan={2} verticalAlignment="center">
        <cspan color={iconColor} fontFamily={iconFontFamily || $fonts.mdi} fontSize={18 * $fontScale} fontWeight="normal" text={icon ? icon + '  ' : null} />
        <cspan text={title} />
    </label>
    <slot />
</gridlayout>
