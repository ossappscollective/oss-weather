import { FontBase } from '@nativescript/core/ui/styling/font-common';

// @akylas/nativescript: Font.withFontWeight() (and other with*) clones with Object.assign, copying the
// cached Android typeface: the new weight is ignored (e.g. canvas Paint.setFontWeight after a draw)
export function fixFontCloneTypeface() {
    if (!__ANDROID__) {
        return;
    }
    const cloneOrDirty = FontBase.prototype.cloneOrDirty;
    FontBase.prototype.cloneOrDirty = function (this: FontBase, force?: boolean) {
        const clone = cloneOrDirty.call(this, force);
        if (clone !== this) {
            Reflect.set(clone, '_typeface', null);
        }
        return clone;
    };
}
