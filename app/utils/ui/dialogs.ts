import { MDCAlertControlerOptions, PromptOptions, alert as materialAlert, confirm as materialConfirm, prompt as materialPrompt } from '@nativescript-community/ui-material-dialogs';
import { showingDialogs } from '@nativescript-community/ui-material-dialogs/dialogs-common';
import { AlertOptions, Color, ConfirmOptions, Font, Utils } from '@nativescript/core';
import { get } from 'svelte/store';
import { modernColors } from '~/helpers/modernTheme';
import { textFontFamily } from '~/utils/designStyle';
import { accentFontWeight, colors, designStyle } from '~/variables';

const MODERN_DIALOG_RADIUS = 20;
const MODERN_DIALOG_INSET = 24;
const MODERN_DIALOG_TITLE_SIZE = 19;

// modern: the native dialog gets the modern surface, rounder corners, Inter texts and accent buttons
function styleAndroidDialog(dialog: androidx.appcompat.app.AlertDialog) {
    const { colorModernAccent, colorModernSurface } = get(modernColors);
    const density = Utils.layout.getDisplayDensity();
    const background = new android.graphics.drawable.GradientDrawable();
    background.setColor(new Color(colorModernSurface).android);
    background.setCornerRadius(MODERN_DIALOG_RADIUS * density);
    const inset = MODERN_DIALOG_INSET * density;
    dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.InsetDrawable(background, inset, inset, inset, inset));
    const fontFamily = textFontFamily('modern');
    const titleTypeface = new Font(fontFamily, undefined, undefined, get(accentFontWeight)).getAndroidTypeface();
    const textTypeface = new Font(fontFamily, undefined).getAndroidTypeface();
    const resources = dialog.getContext().getResources();
    // the title view is the appcompat one (package id), the message the framework one
    const title = dialog.findViewById(resources.getIdentifier('alertTitle', 'id', dialog.getContext().getPackageName()));
    if (title instanceof android.widget.TextView) {
        title.setTypeface(titleTypeface);
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_DIP, MODERN_DIALOG_TITLE_SIZE);
    }
    const message = dialog.findViewById(resources.getIdentifier('android:id/message', null, null));
    if (message instanceof android.widget.TextView) {
        message.setTypeface(textTypeface);
    }
    for (const which of [android.content.DialogInterface.BUTTON_POSITIVE, android.content.DialogInterface.BUTTON_NEGATIVE, android.content.DialogInterface.BUTTON_NEUTRAL]) {
        const button = dialog.getButton(which);
        if (button) {
            button.setTypeface(titleTypeface);
            button.setAllCaps(false);
            button.setTextColor(new Color(which === android.content.DialogInterface.BUTTON_POSITIVE ? colorModernAccent : get(colors).colorOnSurfaceVariant).android);
        }
    }
}

function modernOptions<T>(options: T): T & MDCAlertControlerOptions {
    const { colorOnSurface, colorOnSurfaceVariant } = get(colors);
    const { colorModernAccent } = get(modernColors);
    const fontFamily = textFontFamily('modern');
    return {
        titleColor: new Color(colorOnSurface),
        messageColor: new Color(colorOnSurfaceVariant),
        buttonTitleColor: new Color(colorModernAccent),
        buttonInkColor: new Color(colorModernAccent),
        cornerRadius: MODERN_DIALOG_RADIUS,
        titleFont: new Font(fontFamily, 19, undefined, get(accentFontWeight)),
        messageFont: new Font(fontFamily, 15),
        buttonFont: new Font(fontFamily, 15, undefined, get(accentFontWeight)),
        ...options
    };
}

function showModern<T, R>(show: (options: T & MDCAlertControlerOptions) => Promise<R>, options: T & MDCAlertControlerOptions) {
    if (get(designStyle) !== 'modern') {
        return show(options);
    }
    const result = show(modernOptions(options));
    // the dialog is shown synchronously, it is the last one
    const dialog = showingDialogs[showingDialogs.length - 1];
    if (__ANDROID__ && dialog) {
        styleAndroidDialog(dialog);
    }
    return result;
}

// same api as @nativescript-community/ui-material-dialogs, with the modern style
export function alert(options: AlertOptions & MDCAlertControlerOptions) {
    return showModern(materialAlert, options);
}
export function confirm(options: ConfirmOptions & MDCAlertControlerOptions) {
    return showModern(materialConfirm, options);
}
export function prompt(options: PromptOptions & MDCAlertControlerOptions) {
    // modern: an outlined field, styled from css (mdtextfield in app/_modern.scss)
    const modernPrompt = get(designStyle) === 'modern' ? { ...options, textFieldProperties: { variant: 'outline', ...options.textFieldProperties } } : options;
    return showModern(materialPrompt, modernPrompt);
}
