import { restartApp } from '@akylas/nativescript-app-utils';
import { MDCAlertControlerOptions, alert, confirm } from '@nativescript-community/ui-material-dialogs';
import { HorizontalPosition, PopoverOptions, VerticalPosition } from '@nativescript-community/ui-popover';
import { closePopover, showPopover } from '@nativescript-community/ui-popover/svelte';
import { AlertOptions, Application, GridLayout, View } from '@nativescript/core';
import { debounce } from '@nativescript/core/utils';
import { showError } from '@shared/utils/showError';
import { ComponentInstanceInfo, hideLoading, resolveComponentElement, showSnack } from '@shared/utils/ui';
import { ComponentProps } from 'svelte';
import { get } from 'svelte/store';
import type OptionSelect__SvelteComponent_ from '~/components/common/OptionSelect.svelte';
import { ALERT_OPTION_MAX_HEIGHT } from '~/helpers/constants';
import { l, lc } from '~/helpers/locale';
import { colors, fontScale, screenWidthDips } from '~/variables';

export * from '@shared/utils/ui';

export async function showAlertOptionSelect<T>(props?: ComponentProps<OptionSelect__SvelteComponent_>, options?: Partial<AlertOptions & MDCAlertControlerOptions>) {
    const component = (await import('~/components/common/OptionSelect.svelte')).default;
    let componentInstanceInfo: ComponentInstanceInfo<GridLayout, OptionSelect__SvelteComponent_>;
    try {
        componentInstanceInfo = resolveComponentElement(component, {
            onClose: (result) => {
                view.bindingContext.closeCallback(result);
            },
            onCheckBox(item, value, e) {
                view.bindingContext.closeCallback(item);
            },
            trackingScrollView: 'collectionView',
            ...props
        }) as ComponentInstanceInfo<GridLayout, OptionSelect__SvelteComponent_>;
        const view: View = componentInstanceInfo.element.nativeView;
        const result = await alert({
            view,
            okButtonText: lc('cancel'),
            ...(options ? options : {})
        });
        return result;
    } catch (err) {
        throw err;
    } finally {
        componentInstanceInfo.element.nativeElement._tearDownUI();
        componentInstanceInfo.viewInstance.$destroy();
        componentInstanceInfo = null;
    }
}

export async function showPopoverMenu<T = any>({
    anchor,
    closeOnClose = true,
    horizPos,
    onChange,
    onCheckBox,
    onClose,
    onLongPress,
    options,
    props,
    vertPos
}: { options; anchor; onClose?; onCheckBox?; onLongPress?; props?; closeOnClose?; onChange? } & Partial<PopoverOptions>) {
    const { colorSurfaceContainer } = get(colors);
    const OptionSelect = (await import('~/components/common/OptionSelect.svelte')).default;
    const rowHeight = (props?.rowHeight ?? 58) * get(fontScale);
    const result: T = await showPopover({
        backgroundColor: colorSurfaceContainer,
        view: OptionSelect,
        anchor,
        horizPos: horizPos ?? HorizontalPosition.ALIGN_LEFT,
        vertPos: vertPos ?? VerticalPosition.CENTER,
        props: {
            borderRadius: 10,
            elevation: __IOS__ ? 0 : 3,
            margin: 4,
            fontWeight: 500,
            backgroundColor: colorSurfaceContainer,
            containerColumns: 'auto',
            rowHeight: !!props?.autoSizeListItem ? null : rowHeight,
            height: props.height !== 'auto' && props?.autoSizeListItem !== true ? Math.min(rowHeight * options.length, props?.maxHeight || 400) : undefined,
            width: 200 * get(fontScale),
            options,
            onLongPress,
            onCheckBox,
            onChange,
            onClose: async (item) => {
                if (closeOnClose) {
                    // if (__IOS__) {
                    // on iOS we need to wait or if onClose shows an alert dialog it wont work
                    await closePopover();
                    // } else {
                    // closePopover();
                    // }
                }
                try {
                    await onClose?.(item);
                } catch (error) {
                    showError(error);
                } finally {
                    hideLoading();
                }
            },
            ...(props || {})
        }
    });
    return result;
}

export function isLandscape(orientation = Application.orientation()) {
    return orientation === 'landscape';
}

export function createView<T extends View>(claz: new () => T, props: Partial<Pick<T, keyof T>> = {}, events?) {
    const view: T = new claz();
    Object.assign(view, props);
    if (events) {
        Object.keys(events).forEach((k) => view.on(k, events[k]));
    }
    return view;
}

export async function showSliderPopover({
    anchor,
    debounceDuration = 100,
    formatter,
    horizPos = HorizontalPosition.ALIGN_LEFT,
    icon,
    max = 100,
    min = 0,
    onChange,
    step = 1,
    title,
    value,
    valueFormatter,
    vertPos = VerticalPosition.CENTER,
    width = 0.8 * screenWidthDips
}: {
    title?;
    debounceDuration?;
    icon?;
    min?;
    max?;
    step?;
    formatter?;
    valueFormatter?;
    horizPos?;
    anchor;
    vertPos?;
    width?;
    value?;
    onChange?;
}) {
    const component = (await import('~/components/common/SliderPopover.svelte')).default;
    const { colorSurfaceContainer } = get(colors);

    return showPopover({
        backgroundColor: colorSurfaceContainer,
        view: component,
        anchor,
        horizPos,
        vertPos,
        props: {
            title,
            icon,
            min,
            max,
            step,
            width,
            formatter,
            valueFormatter,
            value,
            onChange: debounceDuration ? debounce(onChange, debounceDuration) : onChange
        }

        // trackingScrollView: 'collectionView'
    });
}
let confirmingRestart = false;
export async function confirmRestartApp() {
    if (confirmingRestart) {
        return;
    }
    try {
        confirmingRestart = true;
        if (__ANDROID__) {
            DEV_LOG && console.log('confirm restart');
            const result = await confirm({
                message: lc('restart_app'),
                okButtonText: lc('restart'),
                cancelButtonText: lc('later')
            });
            if (result) {
                restartApp();
            }
        } else {
            await showSnack({ message: lc('please_restart_app') });
        }
    } finally {
        confirmingRestart = false;
    }
}

export async function selectValue<T = any>(
    options: { data: T; title: string }[],
    currentValue: T,
    alertOptions?: Partial<AlertOptions & MDCAlertControlerOptions>,
    props?: Partial<ComponentProps<OptionSelect__SvelteComponent_>>
) {
    // return tryCatch(async () => {
    let selectedIndex = -1;
    options = options.map((d, index) => {
        const selected = currentValue === d.data;
        if (selected) {
            selectedIndex = index;
        }
        return {
            boxType: 'circle',
            type: 'checkbox',
            value: selected,
            ...d
        };
    });
    const result = await showAlertOptionSelect(
        {
            height: Math.min(options.length * 56 * get(fontScale), ALERT_OPTION_MAX_HEIGHT),
            // rowHeight: 56,
            autoSizeListItem: true,
            selectedIndex,
            options,
            ...(props ?? {})
        },
        alertOptions
    );
    return result?.data as T;
    // });
}

export function getDateFormatHTMLArgs() {
    const cols = get(colors);
    return [`<span style="background-color:${cols.colorSurfaceContainerHigh};">YYYY,M,MM,D,H,s...</span>`, `<a href="https://day.js.org/docs/en/display/format">${l('here')}</a>`];
}
