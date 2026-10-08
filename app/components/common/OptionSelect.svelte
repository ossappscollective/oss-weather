<svelte:options accessors />

<script context="module" lang="ts">
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { openFilePicker } from '@nativescript-community/ui-document-picker';
    import { closeBottomSheet } from '@nativescript-community/ui-material-bottomsheet/svelte';
    import { TextField } from '@nativescript-community/ui-material-textfield';
    import { EventData, File, ObservableArray, Utils, View } from '@nativescript/core';
    import { debounce } from '@nativescript/core/utils';
    import { onDestroy } from 'svelte';
    import { Template } from '@nativescript-community/svelte-native/components';
    import IconButton from '~/components/common/IconButton.svelte';
    import ListItem from '~/components/common/ListItem.svelte';
    import ListItemAutoSize from '~/components/common/ListItemAutoSize.svelte';
    import SettingsSlider from '~/components/settings/SettingsSlider.svelte';
    import { lc } from '~/helpers/locale';
    import { accentFontWeight, colors, designStyle, fontScale, fonts } from '~/variables';
    import { styleModernSwitch } from '~/utils/ui/modernSwitch';
    import { Canvas, CanvasView } from '@nativescript-community/ui-canvas';

    export interface IListItem {
        showBottomLine?: boolean;
        iconFontSize?: number;
        subtitleFontSize?: number;
        rightValue?: string | (() => string);
        // modern popover menus: first item of a group, drawn with a separator above
        groupStart?: boolean;
        iconColor?: string | Color;
        rightValueFontSize?: number;
        fontSize?: number;
        html?: any;
        name?: string;
        icon?: string;
        color?: string | Color;
        rippleColor?: string | Color;
        title?: string;
        subtitle?: string;
        type?: string;
        onLinkTap?: (event) => void;
        onLongPress?: (event) => void;
        onDraw?: (item: IListItem, event: { canvas: Canvas; object: CanvasView }) => void;
        [k: string]: any;
    }
    export interface OptionType extends IListItem {
        isPick?: boolean;
        boxType?: string;
        type?: string;
        [k: string]: any;
    }
</script>

<script lang="ts">
    export let title: string = null;
    export let showFilter = false;
    export let showBorders = false;
    export let backgroundColor = null;
    export let borderRadius = 8;
    export let rowHeight = null;
    export let autofocus = false;
    export let estimatedItemSize = true;
    export let autoSize = false;
    export let isScrollEnabled = true;
    export let width: string | number = '*';
    export let containerColumns: string = '*';
    export let autoSizeListItem: boolean = false;
    export let fontWeight = 'bold';
    export let options: OptionType[] | ObservableArray<OptionType>;
    export let onClose = null;
    export let selectedIndex = -1;
    export let height: number | string = null;
    export let fontSize = 16;
    export let iconFontSize = 24;
    export let onlyOneSelected = false;
    export let currentlyCheckedItem = null;
    export let onCheckBox: (item, value, e) => void = null;
    export let onChange: (item, value, e) => void = null;
    export let onRightIconTap: (item, e) => void = null;
    export let onLongPress: (item, e) => void = null;

    export let titleProps: Partial<svelteNative.JSX.LabelAttributes> = {};
    export let titleHolderProps: Partial<svelteNative.JSX.StackLayoutAttributes> = {};
    export let subtitleProps: Partial<svelteNative.JSX.LabelAttributes> = {};
    export let templateProps: Partial<svelteNative.JSX.GridLayoutAttributes> & {
        [k: string]: Partial<svelteNative.JSX.ViewAttributes>;
    } = {};

    export let component = autoSizeListItem ? ListItemAutoSize : ListItem;
    let filteredOptions: OptionType[] | ObservableArray<OptionType> = null;
    let filter: string = null;

    // technique for only specific properties to get updated on store change
    $: ({ colorOnSurface, colorOutline } = $colors);
    // modern: regular row titles separated by hairlines, the title in the accent weight
    $: modern = $designStyle === 'modern';
    $: rowFontWeight = modern ? 'normal' : fontWeight;
    // popover menus only separate their groups (item.groupStart), dialog and sheet lists separate all rows
    export let isMenu = false;
    $: rowBorders = (modern && !isMenu) || showBorders;

    function updateFiltered(filter) {
        if (filter) {
            filteredOptions = options.filter((d) => d.name.indexOf(filter) !== -1);
        } else {
            filteredOptions = options;
        }
    }
    const updateFilteredDebounce = debounce(updateFiltered, 500);
    updateFiltered(filter);
    $: updateFilteredDebounce(filter);

    function close(value?: OptionType) {
        (onClose || closeBottomSheet)(value);
    }

    let checkboxTapTimer;
    function clearCheckboxTimer() {
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
    }
    async function onRightTap(item: OptionType, event) {
        onRightIconTap?.(item, event);
    }
    async function onTap(item: OptionType, event) {
        if (item.isPick) {
            try {
                const result = await openFilePicker({
                    extensions: ['file/*'],
                    multipleSelection: false,
                    pickerMode: 0,
                    forceSAF: true
                });
                if (File.exists(result.files[0])) {
                    const file = File.fromPath(result.files[0]);
                    close({ name: file.name, data: { url: file.path }, isPick: true });
                } else {
                    close(null);
                }
            } catch (err) {
                close(null);
            }
        } else if (item.type === 'checkbox' || item.type === 'switch') {
            // we dont want duplicate events so let s timeout and see if we clicking diretly on the checkbox
            // the modernSwitch row holds its switch, list items are wrapped
            const checkboxView: CheckBox = (event.object as View).getViewById('checkbox') || ((event.object as View).parent as View).getViewById('checkbox');
            clearCheckboxTimer();
            checkboxTapTimer = setTimeout(() => {
                checkboxView.checked = !checkboxView.checked;
            }, 10);
        } else {
            close(item);
        }
    }
    let ignoreNextOnCheckBoxChange = false;
    function onCheckedChanged(item, event) {
        // DEV_LOG && console.log('onCheckedChanged', event.value, ignoreNextOnCheckBoxChange);
        clearCheckboxTimer();
        if (ignoreNextOnCheckBoxChange) {
            ignoreNextOnCheckBoxChange = false;
            return;
        }
        ignoreNextOnCheckBoxChange = true;
        if (onlyOneSelected && options instanceof ObservableArray) {
            if (event.value) {
                const oldSelected = currentlyCheckedItem;
                if (oldSelected === item) {
                    ignoreNextOnCheckBoxChange = false;
                    return;
                }
                DEV_LOG && console.log('onlyOneSelected', oldSelected);
                item.value = true;
                currentlyCheckedItem = item;
                if (oldSelected) {
                    const index = options.indexOf(oldSelected);
                    DEV_LOG && console.log('onlyOneSelected1', index);
                    if (index >= 0) {
                        oldSelected.value = false;
                        options.setItem(index, oldSelected);
                    }
                }
                options.setItem(options.indexOf(currentlyCheckedItem), currentlyCheckedItem);
            } else {
                // we dont allow to have none selected
                ignoreNextOnCheckBoxChange = false;
                const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
                checkboxView.checked = true;
                return;
            }
        }
        onCheckBox?.(item, event.value, event);
        ignoreNextOnCheckBoxChange = false;
    }
    onDestroy(() => {
        blurTextField();
    });
    function onTextFieldLoaded(event: EventData) {
        setTimeout(() => {
            DEV_LOG && console.log('onTextFieldLoaded', autofocus);
            if (autofocus) {
                (event.object as TextField).requestFocus();
            } else {
                (event.object as TextField).clearFocus();
            }
        }, 0);
    }
    function blurTextField() {
        Utils.dismissSoftInput();
    }

    // modern popover menus: icon, title and value chip rows separated by full width lines (app/_modern.scss)
    function modernMenuRowClass(item: OptionType) {
        const index = filteredOptions.indexOf(item);
        return 'modernMenuRow' + (index === 0 ? ' modernMenuFirst' : item.groupStart ? ' modernMenuGroupStart' : '');
    }
    function itemTemplateSelector(item) {
        if (modern && isMenu && (!item.type || item.type === 'lefticon')) {
            return 'modernMenu';
        }
        if (modern && isMenu && item.type === 'switch') {
            return 'modernSwitch';
        }
        // modern single choice (selectValue): circle / circle-check rows, a tap picks the option
        if (modern && item.type === 'checkbox' && item.boxType === 'circle' && !onlyOneSelected) {
            return 'modernChoice';
        }
        // modern multi choice: icon, title and a square check on the right
        if (modern && item.type === 'checkbox' && item.boxType !== 'circle') {
            return 'modernCheck';
        }
        if (item.type) {
            return item.type;
        }
        if (autoSizeListItem && item.icon) {
            return 'lefticon';
        }
        if (item.rightIcon) {
            return 'righticon';
        }
        return 'default';
    }
    function onDataPopulated(event) {
        if (selectedIndex !== undefined) {
            if (onlyOneSelected) {
                currentlyCheckedItem = options instanceof ObservableArray ? options.getItem(selectedIndex) : options[selectedIndex];
            }
            if (selectedIndex > 0) {
                event.object.scrollToIndex(selectedIndex, false);
            }
        }
    }
</script>

<!-- popovers and dialogs are separate root views: they do not inherit the root font -->
<gesturerootview class={modern ? 'ns-modern' : ''} columns={containerColumns} rows="auto">
    <gridlayout {backgroundColor} {borderRadius} columns={`${width}`} {height} rows="auto,auto,*" {...$$restProps}>
        {#if title}
            {#if modern}
                <label fontSize={18 * $fontScale} fontWeight={$accentFontWeight} margin="16 18 6 18" text={title} />
            {:else}
                <label class="actionBarTitle" fontWeight="bold" margin="10 10 0 10" text={title} />
            {/if}
        {/if}
        {#if showFilter}
            <gridlayout borderColor={colorOutline} margin={modern ? '6 14 4 14' : '10 10 0 10'} row={1}>
                <textfield
                    autocapitalizationType="none"
                    backgroundColor="transparent"
                    hint={lc('search')}
                    placeholder={lc('search')}
                    returnKeyType="search"
                    text={filter}
                    variant="outline"
                    verticalTextAlignment="center"
                    on:loaded={onTextFieldLoaded}
                    on:returnPress={blurTextField}
                    on:textChange={(e) => (filter = e['value'])} />

                <IconButton
                    col={1}
                    gray={true}
                    horizontalAlignment="right"
                    isHidden={!filter || filter.length === 0}
                    size={40}
                    text="mdi-close"
                    verticalAlignment="middle"
                    on:tap={() => {
                        blurTextField();
                        filter = null;
                    }} />
            </gridlayout>
        {/if}
        <collectionView
            {autoSize}
            {estimatedItemSize}
            {isScrollEnabled}
            {itemTemplateSelector}
            items={filteredOptions}
            row={2}
            {rowHeight}
            on:dataPopulated={onDataPopulated}
            ios:contentInsetAdjustmentBehavior={2}>
            <Template key="checkbox" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*,auto"
                    {fontSize}
                    fontWeight={rowFontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={rowBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...templateProps}
                    onLongPress={onLongPress ? (e) => onLongPress(item, e) : null}
                    on:tap={(event) => onTap(item, event)}>
                    <checkbox
                        id="checkbox"
                        boxType={item.boxType}
                        checked={item.value}
                        col={item.boxType === 'circle' ? 0 : 2}
                        verticalAlignment="center"
                        on:checkedChange={(e) => onCheckedChanged(item, e)} />
                </svelte:component>
            </Template>
            <Template key="switch" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*,auto"
                    {fontSize}
                    fontWeight={rowFontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={rowBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...templateProps}
                    onLongPress={onLongPress ? (e) => onLongPress(item, e) : null}
                    on:tap={(event) => onTap(item, event)}>
                    <switch id="checkbox" checked={item.value} col={1} marginLeft={10} on:loaded={styleModernSwitch} on:checkedChange={(e) => onCheckedChanged(item, e)} />
                </svelte:component>
            </Template>
            <Template key="righticon" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="*,auto"
                    {fontSize}
                    fontWeight={rowFontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    showBottomLine={rowBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...templateProps}
                    onLongPress={onLongPress ? (e) => onLongPress(item, e) : null}
                    on:tap={(event) => onTap(item, event)}>
                    <mdbutton class="icon-btn" col={1} text={item.rightIcon} variant="text" on:tap={(event) => onRightTap(item, event)} />
                </svelte:component>
            </Template>
            <Template key="lefticon" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*"
                    {fontSize}
                    fontWeight={rowFontWeight}
                    {item}
                    mainCol={1}
                    showBottomLine={rowBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...templateProps}
                    onLongPress={onLongPress ? (e) => onLongPress(item, e) : null}
                    on:tap={(event) => onTap(item, event)}>
                    <label
                        col={0}
                        color={item.color || colorOnSurface}
                        fontFamily={$fonts.mdi}
                        fontSize={(item.iconFontSize || iconFontSize) * $fontScale}
                        paddingLeft="8"
                        text={item.icon}
                        verticalAlignment="center"
                        width={iconFontSize * 2} />
                </svelte:component>
            </Template>
            <Template key="image" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*"
                    {fontSize}
                    fontWeight={rowFontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={rowBorders}
                    {subtitleProps}
                    title={item.name}
                    {titleHolderProps}
                    {titleProps}
                    {...templateProps}
                    onLongPress={onLongPress ? (e) => onLongPress(item, e) : null}
                    on:tap={(event) => onTap(item, event)}>
                    <image borderRadius={4} col={0} marginBottom={5} marginRight={10} marginTop={5} src={item.image} />
                </svelte:component>
            </Template>
            <Template key="checkbox_image" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*,auto"
                    {fontSize}
                    fontWeight={rowFontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={rowBorders}
                    {subtitleProps}
                    title={item.name}
                    {titleHolderProps}
                    {titleProps}
                    {...templateProps}
                    onLongPress={onLongPress ? (e) => onLongPress(item, e) : null}
                    on:tap={(event) => onTap(item, event)}>
                    <checkbox
                        id="checkbox"
                        boxType={item.boxType}
                        checked={item.value}
                        col={item.boxType === 'circle' ? 0 : 2}
                        verticalAlignment="center"
                        on:checkedChange={(e) => onCheckedChanged(item, e)} />
                    <image borderRadius={4} col={2} marginBottom={5} marginRight={10 + (item.imageMargin ?? 0)} marginTop={5} src={item.image} stretch="aspectFit" width={item.imageWidth ?? 50} />
                </svelte:component>
            </Template>
            <Template key="modernMenu" let:item>
                <gridlayout class={modernMenuRowClass(item)} columns="auto,*,auto" rippleColor={colorOnSurface} on:tap={(event) => onTap(item, event)}>
                    <!-- text icons ("mb") have an iconFontSize: drawn smaller -->
                    <label
                        class={item.iconFontSize ? 'modernMenuIcon modernMenuIconText' : 'modernMenuIcon'}
                        color={item.iconColor || item.color}
                        fontFamily={item.iconFontFamily || $fonts.mdi}
                        text={item.icon}
                        verticalAlignment="center"
                        visibility={item.icon ? 'visible' : 'collapse'} />
                    <stacklayout col={1} verticalAlignment="center">
                        <label class="modernMenuTitle modernEllipsis" color={item.color} text={item.title || item.name} />
                        <label class="modernSubtitle modernEllipsis" text={item.subtitle} visibility={item.subtitle ? 'visible' : 'collapse'} />
                    </stacklayout>
                    <label
                        class="modernChip"
                        col={2}
                        marginLeft={8}
                        text={typeof item.rightValue === 'function' ? item.rightValue() : item.rightValue}
                        verticalAlignment="center"
                        visibility={item.rightValue ? 'visible' : 'collapse'} />
                </gridlayout>
            </Template>
            <Template key="modernChoice" let:item>
                <!-- popover menus have a fixed row height: no dialog padding -->
                <gridlayout class={modernMenuRowClass(item) + (isMenu ? '' : ' modernChoiceRow')} columns="auto,*,auto" rippleColor={colorOnSurface} on:tap={(event) => onCheckBox?.(item, true, event)}>
                    <label
                        class={item.value ? 'modernMenuIcon modernChoiceIconSelected' : 'modernMenuIcon modernChoiceIcon'}
                        text={item.value ? 'mdi-check-circle-outline' : 'mdi-circle-outline'}
                        verticalAlignment="center" />
                    <stacklayout col={1} verticalAlignment="center">
                        <label class={item.value ? 'modernMenuTitle modernStrong' : 'modernMenuTitle'} text={item.title || item.name} textWrap={true} />
                        <label class="modernSubtitle" text={item.subtitle} textWrap={true} visibility={item.subtitle ? 'visible' : 'collapse'} />
                    </stacklayout>
                    <label
                        class="modernChip"
                        col={2}
                        marginLeft={8}
                        text={typeof item.rightValue === 'function' ? item.rightValue() : item.rightValue}
                        verticalAlignment="center"
                        visibility={item.rightValue ? 'visible' : 'collapse'} />
                </gridlayout>
            </Template>
            <Template key="modernCheck" let:item>
                <gridlayout class={modernMenuRowClass(item) + ' modernCheckRow'} columns="auto,*,auto" rippleColor={colorOnSurface} on:tap={(event) => onTap(item, event)}>
                    <label class="modernMenuIcon" color={item.iconColor || item.color} text={item.icon} verticalAlignment="center" visibility={item.icon ? 'visible' : 'collapse'} />
                    <stacklayout col={1} verticalAlignment="center">
                        <label class="modernMenuTitle" text={item.title || item.name} textWrap={true} />
                        <label class="modernSubtitle" text={item.subtitle} textWrap={true} visibility={item.subtitle ? 'visible' : 'collapse'} />
                    </stacklayout>
                    <checkbox id="checkbox" checked={item.value} col={2} marginLeft={8} verticalAlignment="center" on:checkedChange={(e) => onCheckedChanged(item, e)} />
                </gridlayout>
            </Template>
            <Template key="modernSwitch" let:item>
                <gridlayout class={modernMenuRowClass(item) + ' modernSwitchRow'} columns="auto,*,auto" rippleColor={colorOnSurface} on:tap={(event) => onTap(item, event)}>
                    <label class="modernMenuIcon" text={item.icon} verticalAlignment="center" visibility={item.icon ? 'visible' : 'collapse'} />
                    <label class="modernMenuTitle" col={1} text={item.title || item.name} textWrap={true} verticalAlignment="center" />
                    <switch id="checkbox" checked={item.value} col={2} marginLeft={8} on:loaded={styleModernSwitch} on:checkedChange={(e) => onCheckedChanged(item, e)} />
                </gridlayout>
            </Template>
            <Template key="slider" let:item>
                <SettingsSlider {...item} onChange={(value, event) => onChange?.(item, value, event)} />
            </Template>
            <Template let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    {fontSize}
                    fontWeight={rowFontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    showBottomLine={rowBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...templateProps}
                    onLongPress={onLongPress ? (e) => onLongPress(item, e) : null}
                    on:rightTap={(event) => onRightTap(item, event)}
                    on:tap={(event) => onTap(item, event)}>
                </svelte:component>
            </Template>
            <slot name="templates" />
        </collectionView>
    </gridlayout>
</gesturerootview>
