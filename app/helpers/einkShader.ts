import { BitmapShader, TileMode } from '@nativescript-community/ui-canvas';
import { ImageSource } from '@nativescript/core';

let shader: BitmapShader;

// the dither pattern replacing translucent fills on e-ink, loaded when first needed (the color theme can change at runtime)
export function getEInkShader() {
    if (!shader) {
        shader = new BitmapShader(ImageSource.fromFileSync('~/assets/images/pattern.png'), TileMode.REPEAT, TileMode.REPEAT);
    }
    return shader;
}
