/// <reference path="../node_modules/@nativescript/types-ios/lib/ios/objc-x86_64/objc!LinkPresentation.d.ts" />
/// <reference path="../node_modules/@nativescript-community/ui-bottomsheet/bottomsheet.d.ts" />
/// <reference path="../node_modules/@nativescript-community/https/typings/okhttp3.d.ts" />

declare const ATMO_DEFAULT_KEY: string;
declare const OWM_DEFAULT_KEY: string;
declare const MF_DEFAULT_KEY: string;
declare const ACCUWEATHER_DEFAULT_KEY: string;
declare const MF_API_KEY: string;
declare const DEFAULT_LOCATION: string;
declare const DEFAULT_PROVIDER: string;
declare const DEFAULT_PROVIDER_AQI: string;
declare const WIDGETS: boolean;
declare const ICON_FONT_FAMILIES: { app: string; wd: string; wdThin: string; wi: string; mdi: string };
declare const __CATALYST__: boolean;

interface LatLonKeys {
    lat: number;
    lon: number;
    altitude?: number;
}

declare namespace svelteNative.JSX {
    interface WebViewAttributes {
        'on:position'?: (args) => void;
    }
}
