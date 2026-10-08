import { Application, Color, ViewBase } from '@nativescript/core';
import { updateRootCss } from '@shared/utils';
import { get, writable } from 'svelte/store';
import { currentRealTheme, isDarkTheme } from '~/helpers/theme';
import { modernThemeColors } from '~/utils/modernThemeColors';
import { accentFontWeight, colors, designStyle, fontScale } from '~/variables';

const MODERN_TEXT_SIZES = {
    modernTextActionBar: 19,
    modernTextLarge: 17,
    modernTextBody: 15,
    modernTextSmall: 13
};

// modern style colors for code (canvas drawing, popover options), also set as css variables
export const modernColors = writable<ReturnType<typeof modernThemeColors>>(modernThemeColors('#000000', 'light', false));

// css variables of the modern style (see app/_modern.scss), computed from the theme colors
function update() {
    let rootView: ViewBase = Application.getRootView();
    if (rootView?.parent) {
        rootView = rootView.parent;
    }
    const rootViewStyle = rootView?.style;
    const currentColors = get(colors);
    if (!rootViewStyle || !currentColors.colorOnSurface) {
        return;
    }
    const newColors = modernThemeColors(new Color(currentColors.colorOnSurface).hex, get(currentRealTheme), isDarkTheme());
    Object.keys(newColors).forEach((key) => rootViewStyle.setUnscopedCssVariable('--' + key, newColors[key]));
    // css calc() is disabled (__CSS_USE_CSS_TOOLS__): font sizes come scaled
    Object.keys(MODERN_TEXT_SIZES).forEach((key) => rootViewStyle.setUnscopedCssVariable('--' + key, MODERN_TEXT_SIZES[key] * get(fontScale) + ''));
    rootViewStyle.setUnscopedCssVariable('--accentFontWeight', get(accentFontWeight));
    modernColors.set(newColors);
    updateRootCss();
}

export function start() {
    Application.on('colorsChange', update);
    designStyle.subscribe(update);
    fontScale.subscribe(update);
    accentFontWeight.subscribe(update);
}
