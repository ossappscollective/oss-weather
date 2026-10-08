import { Paint } from '@nativescript-community/ui-canvas';
import { Font } from '@nativescript/core/ui/styling/font';
import { textFontFamily } from '~/utils/designStyle';
import { designStyle } from '~/variables';

// the default font follows the design style (Inter in modern), so canvas texts (paints, chart axis
// labels...) that never set a family use it too. Views get it from the root css font-family
export function start() {
    if (__ANDROID__) {
        // Android paints only apply a font once one is set: start from the default font
        const getNative = Paint.prototype.getNative;
        Paint.prototype.getNative = function (this: Paint) {
            if (!Reflect.get(this, 'mFontInternal') && !Reflect.get(this, 'handlesFont')) {
                Reflect.set(this, 'mFontInternal', Font.default);
                Reflect.set(this, 'mNeedsFontUpdate', true);
            }
            return getNative.call(this);
        };
    }
    // changed in place: Font.default is also the default value of every view font (a new instance
    // would make with*() mutate the old shared one instead of cloning it)
    designStyle.subscribe((style) => {
        Object.assign(Font.default, { fontFamily: textFontFamily(style) });
        Reflect.set(Font.default, '_typeface', null);
    });
}
