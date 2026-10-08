import { EventData, Utils, View } from '@nativescript/core';
import { get } from 'svelte/store';
import { designStyle } from '~/variables';

// modern sliders: thin track and a round thumb (colors come from css). The material 3 shape
// (tall track, bar thumb, gaps and stop dots) is not a css property, so it is set natively once loaded
export function styleModernSlider(event: EventData) {
    const view = event.object;
    if (!__ANDROID__ || get(designStyle) !== 'modern' || !(view instanceof View)) {
        return;
    }
    // a com.google.android.material.slider.Slider (no typings)
    const nativeView = view.nativeViewProtected;
    if (typeof nativeView?.setThumbTrackGapSize !== 'function') {
        return;
    }
    const thumbSize = Utils.layout.toDevicePixels(18);
    nativeView.setTrackHeight(Utils.layout.toDevicePixels(4));
    nativeView.setThumbWidth(thumbSize);
    nativeView.setThumbHeight(thumbSize);
    nativeView.setThumbTrackGapSize(0);
    nativeView.setTrackStopIndicatorSize(0);
    nativeView.setTrackInsideCornerSize(Utils.layout.toDevicePixels(2));
}
