import { Color, EventData, View } from '@nativescript/core';
import { get } from 'svelte/store';
import { modernColors } from '~/helpers/modernTheme';
import { designStyle } from '~/variables';

// android.R.attr.state_checked (android.R is not in the metadata)
const STATE_CHECKED = 16842912;

// modern switches: accent track when on, light track when off, white thumb. Track colors are not css
// properties (and a css background colors the whole view), so they are set natively once loaded
export function styleModernSwitch(event: EventData) {
    const view = event.object;
    if (!__ANDROID__ || get(designStyle) !== 'modern' || !(view instanceof View)) {
        return;
    }
    const nativeView = view.nativeViewProtected;
    // a com.google.android.material.materialswitch.MaterialSwitch (no typings)
    if (typeof nativeView?.setTrackDecorationTintList !== 'function') {
        return;
    }
    const { colorModernAccent, colorModernHairlineStrong, colorModernOnAccent } = get(modernColors);
    // java int[][] states (checked, default) and int[] colors
    const states = Array.create('[I', 2);
    const checkedState = Array.create('int', 1);
    checkedState[0] = STATE_CHECKED;
    states[0] = checkedState;
    states[1] = Array.create('int', 0);
    const trackColors = Array.create('int', 2);
    trackColors[0] = new Color(colorModernAccent).android;
    trackColors[1] = new Color(colorModernHairlineStrong).android;
    nativeView.setTrackTintList(new android.content.res.ColorStateList(states, trackColors));
    nativeView.setTrackDecorationTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.TRANSPARENT));
    nativeView.setThumbTintList(android.content.res.ColorStateList.valueOf(new Color(colorModernOnAccent).android));
}
