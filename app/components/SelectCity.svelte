<script lang="ts">
    import { ObservableArray, TextField } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { closeModal } from '@nativescript-community/svelte-native';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import type { FavoriteLocation } from '~/helpers/favorites';
    import { favoriteIcon, favoriteIconColor, isFavorite, toggleFavorite } from '~/helpers/favorites';
    import { getLocationName } from '~/helpers/formatter';
    import { lc } from '~/helpers/locale';
    import { photonSearch } from '~/services/api';
    import { actionBarButtonHeight, colors, designStyle, fontScale, windowInset } from '~/variables';
    import { groupPosition } from '~/utils/settingsGroups';
    import { groupRowClass } from '~/utils/groupClass';
    import IconButton from './common/IconButton.svelte';
    import ListItemAutoSize from './common/ListItemAutoSize.svelte';

    // let { colorOnSurfaceVariant } = $colors;
    // $: ({ colorOnSurfaceVariant } = $colors);

    let textField: NativeViewElementNode<TextField>;
    let loading = false;
    // modern: a "no results" message once a search found nothing
    let searchedText: string = null;
    let searchResults: ObservableArray<FavoriteLocation> = new ObservableArray();
    // modern: a rounded search field and the results in one card
    $: modern = $designStyle === 'modern';
    function resultGroupPosition(item: FavoriteLocation) {
        return modern ? groupPosition(searchResults.indexOf(item), searchResults.length, () => undefined) : null;
    }
    let searchAsTypeTimer: NodeJS.Timeout;
    let currentSearchText: string;

    export let startQuery: string = null;

    function focus() {
        textField && textField.nativeView.requestFocus();
    }
    function unfocus() {
        clearSearchTimeout();
    }

    function onTextChange(e) {
        const query = e.value;
        clearSearchTimeout();

        if (query && query.length > 2) {
            searchAsTypeTimer = setTimeout(() => {
                searchAsTypeTimer = null;
                searchCity();
            }, 500);
        } else if (currentSearchText && currentSearchText.length > 2) {
            unfocus();
        }
        currentSearchText = query;
    }

    async function searchCity() {
        try {
            clearSearchTimeout();
            if (!currentSearchText) {
                return;
            }
            loading = true;
            searchedText = currentSearchText;
            searchResults = new ObservableArray((await photonSearch(currentSearchText)).map((s) => ({ ...s, isFavorite: isFavorite(s) })));
        } catch (err) {
            showError(err);
        } finally {
            loading = false;
        }
    }

    function clearSearchTimeout() {
        if (searchAsTypeTimer) {
            clearTimeout(searchAsTypeTimer);
            searchAsTypeTimer = null;
        }
    }

    function close(item: FavoriteLocation) {
        clearSearchTimeout();
        closeModal(item);
    }
    let firstLayout = true;
    function onLayoutChange(e) {
        if (firstLayout) {
            firstLayout = false;
            // we need to wait a bit before requesting focus or the keyboard wont show on android
            setTimeout(() => {
                if (startQuery) {
                    currentSearchText = startQuery;
                    searchCity();
                } else {
                    focus();
                }
            }, 100);
        }
    }
    async function toggleItemFavorite(item: FavoriteLocation) {
        try {
            item = await toggleFavorite(item);
            const index = searchResults.findIndex((s) => s.coord.lat === item.coord.lat && s.coord.lon === item.coord.lon);
            if (index > -1) {
                searchResults.setItem(index, item);
            }
        } catch (error) {
            showError(error);
        }
    }

    function clearSearch() {
        clearSearchTimeout();
        currentSearchText = null;
        textField.nativeView.text = null;
        searchResults = new ObservableArray();
        searchedText = null;
        focus();
    }
    function getRegion(item: FavoriteLocation) {
        return [item.sys.state, item.sys.country].filter((text) => !!text).join(', ');
    }
    function getItem(item) {
        const data = [];
        if (item.sys.state) {
            data.push(item.sys.state);
        }
        if (item.sys.country) {
            data.push(item.sys.country);
        }
        return {
            title: getLocationName(item),
            subtitle: data.join('\n')
        };
    }
</script>

<!-- <frame backgroundColor="transparent"> -->
<page actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,auto,*" on:layoutChanged={onLayoutChange}>
        <CActionBar modalWindow title={lc('search_city')}>
            {#if !modern}
                <activityIndicator busy={loading} height={$actionBarButtonHeight} verticalAlignment="middle" visibility={loading ? 'visible' : 'collapse'} width={$actionBarButtonHeight} />
            {/if}
        </CActionBar>
        {#if modern}
            <!-- rounded field: search icon, text, clear button -->
            <gridlayout class="modernSearchField" columns="auto,*,auto" margin="6 14 10 14" row={1}>
                <label class="modernMenuIcon modernSecondary" marginLeft={14} text="mdi-magnify" verticalAlignment="center" />
                <textfield
                    bind:this={textField}
                    class="modernSearchInput"
                    col={1}
                    floating="false"
                    hint={lc('search')}
                    returnKeyType="search"
                    text={startQuery}
                    variant="none"
                    on:textChange={onTextChange}
                    on:returnPress={searchCity} />
                <IconButton col={2} gray={true} isHidden={!currentSearchText} size={40} text="mdi-close" on:tap={clearSearch} />
            </gridlayout>
        {:else}
            <textfield bind:this={textField} floating="false" hint={lc('search')} returnKeyType="search" row={1} text={startQuery} on:textChange={onTextChange} on:returnPress={searchCity} />
        {/if}
        {#if modern}
            <!-- same indeterminate bar as the main page, then the empty result message -->
            {#if loading}
                <progress backgroundColor="transparent" busy={true} height={4} indeterminate={true} row={2} verticalAlignment="top" />
            {/if}
            {#if !loading && searchedText && !searchResults?.length}
                <stacklayout horizontalAlignment="center" paddingLeft={28} paddingRight={28} row={2} verticalAlignment="middle">
                    <label class="modernEmptyIcon" color={$colors.colorOnSurfaceVariant} horizontalAlignment="center" text="mdi-magnify" verticalTextAlignment="center" />
                    <label class="modernEmptyTitle" text={lc('no_results')} />
                    <label class="modernEmptyText" text={lc('no_results_desc', searchedText)} textWrap={true} />
                </stacklayout>
            {/if}
        {/if}
        <collectionview items={searchResults} paddingBottom={$windowInset.bottom} row={2}>
            <Template let:item>
                {#if modern}
                    <gridlayout class={groupRowClass(resultGroupPosition(item))} columns="auto,*,auto" padding="10 4 10 14" rippleColor={$colors.colorOnSurface} on:tap={() => close(item)}>
                        <label class="modernMenuIcon modernSecondary" text="mdi-map-marker-circle" verticalAlignment="center" />
                        <stacklayout col={1} verticalAlignment="center">
                            <label class="modernTitle modernStrong" lineBreak="end" maxLines={2} text={getLocationName(item)} textWrap={true} />
                            <label class="modernSubtitle modernEllipsis" text={getRegion(item)} />
                        </stacklayout>
                        <mdbutton
                            class="actionBarButton"
                            col={2}
                            color={favoriteIconColor(item)}
                            rippleColor="#EFB644"
                            text={favoriteIcon(item)}
                            variant="text"
                            on:tap={() => toggleItemFavorite(item)} />
                    </gridlayout>
                {:else}
                    <ListItemAutoSize disableCss={false} item={getItem(item)} on:tap={() => close(item)}>
                        <mdbutton
                            class="icon-btn"
                            col={2}
                            color={favoriteIconColor(item)}
                            rippleColor="#EFB644"
                            text={favoriteIcon(item)}
                            variant="text"
                            verticalAlignment="top"
                            on:tap={() => toggleItemFavorite(item)} />
                    </ListItemAutoSize>
                {/if}
                <!-- <gridlayout col={1} columns="*,auto" padding="10" paddingLeft={10} rippleColor="#aaa" rows="auto,*" verticalAlignment="middle" on:tap={() => close(item)}>
                    <label fontSize={18} lineBreak="end" maxLines={1} text={item.name} />
                    <label color={colorOnSurfaceVariant} fontSize={14} row={1}>
                        <cspan text={item.sys.state || item.sys.country} />
                        <cspan text={' (' + item.sys.postcode + ')'} visibility={item.sys.postcode ? 'visible' : 'hidden'} />
                        <cspan text={'\n' + item.sys.country} visibility={item.sys.state ? 'visible' : 'hidden'} />
                    </label>
                </gridlayout> -->
            </Template>
        </collectionview>
    </gridlayout>
</page>
<!-- </frame> -->
