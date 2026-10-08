<script context="module" lang="ts">
    import { FailureEventData, FinalEventData, getImagePipeline } from '@nativescript-community/ui-image';
    import { VerticalPosition } from '@nativescript-community/ui-popover';
    import { AWebView } from '@nativescript-community/ui-webview';
    import { ZoomImg } from '@nativescript-community/ui-zoomimage';
    import { AndroidActivityBackPressedEventData, Application, ImageSource, Page, Screen, View } from '@nativescript/core';
    import dayjs from 'dayjs';
    import { onDestroy, onMount } from 'svelte';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { FavoriteLocation } from '~/helpers/favorites';
    import { lang, lc, lu } from '~/helpers/locale';
    import { NetworkConnectionStateEvent, NetworkConnectionStateEventData, networkService, request } from '~/services/api';
    import { showError } from '@shared/utils/showError';
    import { share } from '@akylas/nativescript-app-utils/share';
    import { hideLoading, onBackButton, openLink, showLoading, showPopoverMenu } from '~/utils/ui';
    import { modernColors } from '~/helpers/modernTheme';
    import { accentFontWeight, actionBarButtonHeight, actionBarHeight, colors, designStyle, imperial, systemFontScale } from '~/variables';

    function parseUrl(str) {
        const [url, query] = str.split('?');
        const queryParams: Record<string, string | number | boolean> = {};
        query?.split('&').forEach(function (part) {
            const item = part.split('=');
            queryParams[item[0]] = decodeURIComponent(item[1]);
        });
        return { url, queryParams };
    }
</script>

<script lang="ts">
    let { colorOnPrimary, colorOnSurface, colorOnSurfaceVariant } = $colors;
    $: ({ colorOnPrimary, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary } = $colors);
    // modern tabs: sentence case, selected one in the accent weight over a thin primary underline
    $: modern = $designStyle === 'modern';
    let currentUrl = null;
    let currentImageSrc = null;
    // let pullRefresh: NativeViewElementNode<PullToRefresh>;
    let page: NativeViewElementNode<Page>;
    let zoomImageView: NativeViewElementNode<ZoomImg>;
    let webView: NativeViewElementNode<AWebView>;
    let loading = false;
    let tabIndex = 0;
    let networkConnected = networkService.connected;
    export let weatherLocation: FavoriteLocation;
    export const maxAge = dayjs.duration({ days: 1 }).asSeconds();

    function getUrl(tabIndex) {
        return `https://www.meteoblue.com/${lang}/weather/forecast/${tabs[tabIndex].urlId}/${weatherLocation.coord.lat.toFixed(3)}N${weatherLocation.coord.lon.toFixed(3)}E`;
    }
    async function internalFetch(lang: string) {
        currentUrl = getUrl(tabIndex);
        return (
            await request<string>({
                url: currentUrl,
                method: 'GET',
                offlineSupport: true, // not to throw error when no network
                headers: {
                    'Cache-Control': networkConnected ? 'max-age=60*60' : 'only-if-cached',
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0', // meteoblue wants this
                    Cookie: $imperial ? 'temp=FAHRENHEIT;speed=MILE_PER_HOUR;precip=INCH' : 'temp=CELSIUS;speed=KILOMETER_PER_HOUR;precip=MILLIMETER'
                },
                noJSON: true
            })
        ).content;
    }

    async function refresh() {
        try {
            if (tabIndex === 0) {
                return;
            }
            loading = true;
            let result: string;
            try {
                result = await internalFetch(lang.split('_')[0]);
            } catch (error) {
                result = await internalFetch('en');
            }

            const match = result.match(/(?:<a id="chart_download"(?:.|\n)*?)href="(.*?)"/) ?? result.match(/(?:data-(?:href|original)=)["'](\/\/my\.meteoblue\.com\/images\/.*?["'])/);
            if (match) {
                let newImageSrc = match[1].slice(0, -1).replace(/&amp;/g, '&').trim();
                if (!newImageSrc.startsWith('http')) {
                    newImageSrc = 'https:' + newImageSrc;
                }
                // const parsed = parseUrl(newImageSrc);
                // DEV_LOG && console.log('parsed', parsed);
                // if ($imperial) {
                //     Object.assign(parsed.queryParams, {
                //         temperature_units: 'F',
                //         wind_units: 'mph',
                //         precipitation_units: 'inch'
                //     });
                // } else {
                //     Object.assign(parsed.queryParams, {
                //         temperature_units: 'C',
                //         wind_units: 'kmh',
                //         precipitation_units: 'mm'
                //     });
                // }
                // parsed.queryParams.tz = weatherLocation.timezone;
                // parsed.queryParams.darkmode = isDarkTheme();
                // newImageSrc = queryString(parsed.queryParams, parsed.url);
                DEV_LOG && console.log('newImageSrc', newImageSrc);
                if (networkConnected) {
                    getImagePipeline().evictFromCache(newImageSrc);
                }
                if (currentImageSrc !== newImageSrc) {
                    currentImageSrc = newImageSrc;
                } else {
                    zoomImageView.nativeElement.updateImageUri();
                }
            } else {
                currentImageSrc = null;
            }
        } catch (error) {
            loading = false;
            showError(error);
        } finally {
        }
    }
    const onAndroidBackButton = (data: AndroidActivityBackPressedEventData) =>
        onBackButton(page?.nativeView, () => {
            if (tabIndex === 0 && webView.nativeView?.canGoBack) {
                data.cancel = true;
                webView.nativeView.goBack();
            }
        });
    onMount(() => {
        networkService.on(NetworkConnectionStateEvent, (event: NetworkConnectionStateEventData) => {
            try {
                if (networkConnected !== event.data.connected) {
                    networkConnected = event.data.connected;
                }
            } catch (error) {
                showError(error);
            }
        });
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
    });
    onDestroy(() => {
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
    });
    function onWebViewLoaded(e) {
        (e.object as AWebView).autoExecuteJavaScript('window.nsWebViewBridge.injectStyleSheet("meteoblue", "#display_mobile_ad_in_header {display:none;}\\n.intro{display:none;}", false);', 'css');
    }

    // async function onPullToRefresh() {
    //     try {
    //         if (pullRefresh) {
    //             pullRefresh.nativeView.refreshing = false;
    //         }
    //         await refresh();
    //     } catch (error) {
    //         showError(error);
    //     }
    // }
    function onNavigatedTo() {
        refresh();
    }

    const tabs = [
        {
            name: lu('weather'),
            title: lc('weather'),
            urlId: 'week'
        },
        {
            name: lu('meteogram'),
            title: lc('meteogram'),
            urlId: 'meteogram'
        },
        {
            name: lu('all_in_one'),
            title: lc('all_in_one'),
            urlId: 'meteogramone'
        }
        // {
        //     name: lu('seven_days'),
        //     urlId: 'meteogramextended'
        // }
    ];
    function setTabIndex(value: number) {
        if (tabIndex !== value) {
            tabIndex = value;
            refresh();
        }
    }
    function onImageFailure(event: FailureEventData) {
        showError(event.error);
        loading = false;
    }
    function onImageLoaded(event: FinalEventData) {
        const imageRatio = event.imageInfo.getWidth() / event.imageInfo.getHeight();
        const viewRatio = (event.object as View).getMeasuredWidth() / (event.object as View).getMeasuredHeight();
        let zoomScale = 1;
        if (imageRatio > viewRatio) {
            zoomScale = 1 / viewRatio;
        }
        zoomImageView.nativeElement.setZoom(zoomScale, false);
        loading = false;
    }
    function openInBrowser() {
        try {
            openLink(getUrl(0));
        } catch (error) {
            showError(error);
        }
    }
    async function showOptions(event) {
        try {
            const options = [
                {
                    icon: 'mdi-share-variant',
                    id: 'share',
                    name: lc('share')
                }
            ] as any;
            // ).concat(
            //     __ANDROID__
            //         ? [
            //               {
            //                   icon: 'mdi-export',
            //                   id: 'save',
            //                   name: lc('export')
            //               }
            //           ]
            //         : []
            await showPopoverMenu({
                options,
                anchor: event.object,
                vertPos: VerticalPosition.BELOW,
                props: {
                    width: 220 * $systemFontScale,
                    maxHeight: Screen.mainScreen.heightDIPs - $actionBarHeight
                    // autoSizeListItem: true
                },
                onClose: async (item) => {
                    try {
                        if (item) {
                            switch (item.id) {
                                case 'share':
                                    if (currentImageSrc) {
                                        showLoading();
                                        DEV_LOG && console.log('share', currentImageSrc);
                                        await share({
                                            image: await ImageSource.fromUrl(currentImageSrc)
                                        });
                                    }
                                    break;
                                // case 'save':
                                //     await permRequest('storage');
                                //     const name = `${weatherLocation?.name}_${tabs[tabIndex].urlId}.jpg`;
                                //     const imageSource = await ImageSource.fromUrl(currentImageSrc);
                                //     await imageSource.saveToFileAsync(
                                //         path.join(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS).getAbsolutePath(), name),
                                //         'jpg',
                                //         80
                                //     );
                                //     showSnack({ message: lc('image_save_in_download', name) });
                                //     break;
                            }
                        }
                    } catch (error) {
                        showError(error);
                    } finally {
                        hideLoading();
                    }
                }
            });
        } catch (error) {
            showError(error);
        }
    }
</script>

<page bind:this={page} actionBarHidden={true} on:navigatedTo={onNavigatedTo}>
    <gridlayout rows="auto,auto,*">
        <CActionBar titleProps={{ visibility: 'visible' }}>
            <span slot="subtitle" fontWeight={$accentFontWeight} text="meteoblue" />
            <span slot="subtitle2" color={colorOnSurfaceVariant} fontSize={12} fontWeight="normal" text={'\n' + weatherLocation.name} />
            <activityIndicator busy={loading} height={$actionBarButtonHeight} verticalAlignment="middle" visibility={loading ? 'visible' : 'collapse'} width={$actionBarButtonHeight} />
            <mdbutton class="actionBarButton" text="mdi-refresh" variant="text" verticalAlignment="middle" on:tap={refresh} />
            <mdbutton class="actionBarButton" text="mdi-web" variant="text" verticalAlignment="middle" on:tap={openInBrowser} />
            <mdbutton
                id="menu_button"
                class="actionBarButton"
                text="mdi-dots-vertical"
                variant="text"
                verticalAlignment="middle"
                visibility={currentImageSrc && !loading ? 'visible' : 'collapsed'}
                on:tap={showOptions} />
        </CActionBar>
        <gridlayout colSpan={3} columns={new Array(tabs.length).fill('*').join(',')} height={48} row={1}>
            {#each tabs as tab, index}
                <canvaslabel
                    col={index}
                    color={modern && index !== tabIndex ? colorOnSurfaceVariant : colorOnSurface}
                    disableCss={true}
                    fontSize={modern ? 14 : 15}
                    fontWeight={modern ? (index === tabIndex ? $accentFontWeight : 'normal') : '500'}
                    text={modern ? tab.title : tab.name}
                    textAlignment="center"
                    verticalTextAlignment="center"
                    on:tap={() => setTabIndex(index)} />
            {/each}
            {#if modern}
                <absolutelayout backgroundColor={$modernColors.colorModernHairlineStrong} colSpan={tabs.length} height={1} verticalAlignment="bottom" />
                <absolutelayout backgroundColor={$modernColors.colorModernAccent} borderRadius={1} col={tabIndex} height={2} verticalAlignment="bottom" width="60%" />
            {:else}
                <absolutelayout backgroundColor={colorOnSurface} col={tabIndex} height={3} verticalAlignment="bottom" width="50%" />
            {/if}
        </gridlayout>
        <!-- <pullrefresh bind:this={pullRefresh} row={2} on:refresh={onPullToRefresh}> -->

        <awebview
            bind:this={webView}
            builtInZoomControls={false}
            debugMode={true}
            displayZoomControls={false}
            normalizeUrls={false}
            row={2}
            src={getUrl(tabIndex)}
            visibility={tabIndex === 0 ? 'visible' : 'hidden'}
            webConsoleEnabled={true}
            on:loaded={onWebViewLoaded} />
        <zoomimage
            bind:this={zoomImageView}
            height="100%"
            maxZoom={10}
            noCache={networkConnected}
            row={2}
            src={currentImageSrc}
            visibility={tabIndex !== 0 ? 'visible' : 'hidden'}
            android:stretch="fitStart"
            ios:stretch="aspectFit"
            width="100%"
            on:finalImageSet={onImageLoaded}
            on:failure={onImageFailure} />
        <!-- </pullrefresh> -->
    </gridlayout>
</page>
