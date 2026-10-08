import { ObjectSpans, createNativeAttributedString } from '@nativescript-community/text';
import { get } from 'svelte/store';
import { textFontFamily } from '~/utils/designStyle';
import { designStyle } from '~/variables';

// spans default to the text font: without a family, Android draws span weights on the default
// typeface (no real bold) and iOS falls back to the system font
export function textAttributedString(data: ObjectSpans) {
    return createNativeAttributedString({ fontFamily: textFontFamily(get(designStyle)), ...data });
}
