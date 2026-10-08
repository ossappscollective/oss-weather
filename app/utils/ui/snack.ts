import { SnackBar, SnackBarOptions } from '@nativescript-community/ui-material-snackbar';
import { Color, Font, Utils } from '@nativescript/core';
import { get } from 'svelte/store';
import { textFontFamily } from '~/utils/designStyle';
import { accentFontWeight, colors, designStyle } from '~/variables';

const MODERN_SNACK_RADIUS = 12;
const MODERN_SNACK_ACTION_COLOR = '#85B7EB';

// modern: inverted card colors, rounder corners and the app fonts (the corner radius and the
// typefaces are not snackbar options, they are set on the native view)
function styleAndroidSnack(snackbar: com.google.android.material.snackbar.Snackbar, backgroundColor: string) {
    const view = snackbar.getView();
    const background = new android.graphics.drawable.GradientDrawable();
    background.setColor(new Color(backgroundColor).android);
    background.setCornerRadius(MODERN_SNACK_RADIUS * Utils.layout.getDisplayDensity());
    view.setBackground(background);
    const context = view.getContext();
    const fontFamily = textFontFamily('modern');
    const text = view.findViewById(context.getResources().getIdentifier('snackbar_text', 'id', context.getPackageName()));
    if (text instanceof android.widget.TextView) {
        text.setTypeface(new Font(fontFamily, undefined).getAndroidTypeface());
    }
    const action = view.findViewById(context.getResources().getIdentifier('snackbar_action', 'id', context.getPackageName()));
    if (action instanceof android.widget.TextView) {
        action.setTypeface(new Font(fontFamily, undefined, undefined, get(accentFontWeight)).getAndroidTypeface());
        action.setAllCaps(false);
    }
}

// same api as @nativescript-community/ui-material-snackbar showSnack, with the modern style
export function showSnack(options: SnackBarOptions) {
    if (get(designStyle) !== 'modern') {
        return new SnackBar().showSnack(options);
    }
    const { colorOnSurface, colorSurface } = get(colors);
    const snack = new SnackBar();
    const result = snack.showSnack({ textColor: colorSurface, actionTextColor: MODERN_SNACK_ACTION_COLOR, ...options });
    // the native snackbar is created synchronously by showSnack
    const snackbar = Reflect.get(snack, '_snackbar');
    if (__ANDROID__ && snackbar) {
        styleAndroidSnack(snackbar, colorOnSurface);
    }
    return result;
}
