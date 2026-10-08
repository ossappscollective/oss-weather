import { Application, CSSUtils } from '@nativescript/core';
import { updateRootCss } from '@shared/utils';
import { designStyle } from '~/variables';

// root views get an ns-modern or ns-classic class, so css can follow the design style (font family)
export function start() {
    let currentClass: string;
    designStyle.subscribe((style) => {
        const cssClass = `${CSSUtils.CLASS_PREFIX}${style}`;
        if (cssClass === currentClass) {
            return;
        }
        if (currentClass) {
            CSSUtils.removeSystemCssClass(currentClass);
        }
        // system classes are added to root views created later (modals, new activities)
        CSSUtils.pushToSystemCssClasses(cssClass);
        const rootView = Application.getRootView();
        if (rootView) {
            for (const view of [rootView, ...(rootView._getRootModalViews() ?? [])]) {
                if (currentClass) {
                    view.cssClasses.delete(currentClass);
                }
                view.cssClasses.add(cssClass);
            }
            updateRootCss();
        }
        currentClass = cssClass;
    });
}
