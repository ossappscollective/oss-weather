import { Color } from '@nativescript/core';
import { isDarkTheme } from '~/helpers/theme';

// the home screen widgets background (widgetBackground in WidgetTheme.kt), for the in-app previews
export function widgetBackground() {
    return isDarkTheme() ? new Color(230, 0, 0, 0) : new Color(245, 255, 255, 255);
}
