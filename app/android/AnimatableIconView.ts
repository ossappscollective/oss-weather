import { StackLayout } from '@nativescript/core';

export class AnimatableIconView extends StackLayout {
    createNativeView() {
        if (__ANDROID__) {
            return new com.akylas.weather.widgets.AnimatableIconView(this._context);
        }
        return super.createNativeView();
    }
}
