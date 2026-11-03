import { Font } from '@nativescript/core/ui/styling/font';

// numeric value of a css font weight, kept inside a variable font weight axis range
function variableFontWeight(weight: string | number | undefined, min: number, max: number) {
    let value: number;
    if (weight === 'bold') {
        value = 700;
    } else if (weight === undefined || weight === null || weight === 'normal') {
        value = 400;
    } else {
        value = typeof weight === 'number' ? weight : parseInt(weight, 10);
    }
    if (!Number.isFinite(value)) {
        value = 400;
    }
    return Math.min(max, Math.max(min, value));
}

// iOS: UIKit does not pick the weight of a variable font from the weight trait (regular text and fake
// bold), so Inter gets its weight on the wght axis. Android uses the res/font/inter.xml family instead
const INTER_WEIGHT_AXIS = { min: 300, max: 700 };

export function installVariableFontWeights() {
    if (!__IOS__) {
        return;
    }
    const getUIFont = Font.prototype.getUIFont;
    Font.prototype.getUIFont = function (this: Font, defaultFont: UIFont) {
        if (this.fontFamily?.replace(/['"]/g, '') === 'Inter' && !this.fontVariationSettings?.length) {
            const weight = variableFontWeight(this.fontWeight, INTER_WEIGHT_AXIS.min, INTER_WEIGHT_AXIS.max);
            return getUIFont.call(this.withFontVariationSettings([{ axis: 'wght', value: weight }]), defaultFont);
        }
        return getUIFont.call(this, defaultFont);
    };
}
