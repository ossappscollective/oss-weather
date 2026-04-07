// app/services/widgets/shared/WidgetConfigManager.ts
// Shared configuration management for widgets (platform-agnostic)

import { ApplicationSettings, Utils } from '@nativescript/core';
import { DEFAULT_UPDATE_FREQUENCY, WidgetConfig } from './WidgetTypes';
import { lc } from '@nativescript-community/l';
import { getDefaultKindConfig } from './WidgetKindConfigs';
import { WIDGET_KINDS } from './WidgetKindConfigs';
import { widgetService } from 'plugin-widgets/WidgetBridge';

const WIDGET_CONFIGS_KEY = 'widget_configs'; // per-instance configs
const WIDGET_KIND_CONFIGS_KEY = 'widget_kind_configs'; // per-kind default configs
const UPDATE_FREQUENCY_KEY = 'widget_update_frequency';
const CACHE_TIMEOUT_KEY = 'widget_cache_timeout';

const TAG = '[WidgetConfigManager]';

export type WidgetKind = (typeof WIDGET_KINDS)[number];

export const WIDGET_NAMES = {
    SimpleWeatherWidget: lc('widget.simple.name'),
    SimpleWeatherWithDateWidget: lc('widget.withdate.name'),
    SimpleWeatherWithClockWidget: lc('widget.withclock.name'),
    HourlyWeatherWidget: lc('widget.hourly.name'),
    DailyWeatherWidget: lc('widget.daily.name'),
    ForecastWeatherWidget: lc('widget.forecast.name')
};

export class WidgetConfigManager {
    private static configs: { [widgetId: string]: WidgetConfig };
    private static kindConfigs: { [kind: string]: WidgetConfig };

    private static loadConfigs() {
        const data = ApplicationSettings.getString(WIDGET_CONFIGS_KEY);
        DEV_LOG && console.log('loadConfigs', data);
        if (data) {
            try {
                this.configs = JSON.parse(data);
            } catch (error) {
                this.configs = {};
            }
        } else {
            this.configs = {};
        }
    }

    private static loadKindConfigs() {
        const data = ApplicationSettings.getString(WIDGET_KIND_CONFIGS_KEY);
        // DEV_LOG && console.log('loadKindConfigs', data);
        if (data) {
            try {
                this.kindConfigs = JSON.parse(data);
            } catch (error) {
                this.kindConfigs = {};
            }
        } else {
            this.kindConfigs = {};
        }
    }

    /**
     * Get all per-instance widget configurations
     */
    static getAllConfigs(force = false): { [widgetId: string]: WidgetConfig } {
        // DEV_LOG && console.log('getAllConfigs', JSON.stringify(this.configs));
        if (!this.configs || force) {
            this.loadConfigs();
        }
        return this.configs;
    }
    /**
     * Get all per-instance widget configurations
     */
    static reloadConfigs() {
        this.loadKindConfigs();
        this.loadConfigs();
    }

    /**
     * Get all per-kind default configurations
     */
    static getAllKindConfigs(): { [kind: string]: WidgetConfig } {
        if (!this.kindConfigs) {
            this.loadKindConfigs();
        }
        return this.kindConfigs;
    }

    /**
     * Get configuration for specific widget kind (default settings)
     */
    static getKindConfig(widgetKind: string): WidgetConfig {
        const kindConfigs = this.getAllKindConfigs();
        // if (!kindConfigs[widgetKind]) {
        //     kindConfigs[widgetKind] = this.createDefaultConfig();
        //     this.saveAllKindConfigs();
        // }
        return kindConfigs[widgetKind] || getDefaultKindConfig(widgetKind);
    }

    /**
     * Save configuration for specific widget kind (default settings)
     */
    static saveKindConfig(widgetKind: string, config: WidgetConfig): void {
        const kindConfigs = this.getAllKindConfigs();
        kindConfigs[widgetKind] = config;
        this.saveAllKindConfigs();
        // DEV_LOG && console.log(TAG, 'saveKindConfig', widgetKind, config);
    }

    /**
     * Save all kind configurations
     */
    private static saveAllKindConfigs(): void {
        ApplicationSettings.setString(WIDGET_KIND_CONFIGS_KEY, JSON.stringify(this.kindConfigs));
        // DEV_LOG && console.log(TAG, 'saveAllKindConfigs', JSON.stringify(this.kindConfigs));
    }

    /**
     * Get configuration for specific widget instance
     * If no instance config exists, returns the kind config
     */
    static getConfig(widgetId: string): WidgetConfig {
        const configs = this.getAllConfigs();
        // DEV_LOG && console.log(TAG, 'getConfig', widgetId, JSON.stringify(configs));

        // If instance config exists, use it
        if (configs[widgetId]) {
            // DEV_LOG && console.log(TAG, 'getConfig (instance)', widgetId, configs[widgetId]);
            return configs[widgetId];
        }

        // Otherwise, try to get kind config if we know the widget kind
        // This shouldn't normally happen - instances should be created with saveConfig
        // DEV_LOG && console.log(TAG, 'getConfig (no instance found)', widgetId);
        return null;
    }

    /**
     * Create widget instance configuration from kind defaults
     * Called when a new widget is added
     */
    // static createInstanceConfig(widgetId: string, widgetKind: string): WidgetConfig {
    //     const kindConfig = this.getKindConfig(widgetKind);
    //     const instanceConfig = {
    //         ...kindConfig,
    //         widgetKind
    //     };

    //     this.saveConfig(widgetId, instanceConfig);
    //     DEV_LOG && console.log(TAG, 'createInstanceConfig', widgetId, widgetKind, instanceConfig);

    //     return instanceConfig;
    // }

    /**
     * Save configuration for specific widget instance
     */
    static saveConfig(widgetId: string, config: WidgetConfig, widgetKind?: string): void {
        const configs = this.getAllConfigs();
        config.widgetKind = widgetKind || config.widgetKind;
        configs[widgetId] = config;
        this.saveAllConfigs();
        widgetService.saveWidgetConfig(widgetId, config);
        // DEV_LOG && console.log(TAG, 'saveConfig (instance)', widgetId, configs[widgetId]);
    }

    /**
     * Save all instance configurations
     */
    private static saveAllConfigs(): void {
        ApplicationSettings.setString(WIDGET_CONFIGS_KEY, JSON.stringify(this.configs));
    }

    /**
     * Delete configuration for specific widget instance
     */
    static deleteConfig(widgetId: string): void {
        const configs = this.getAllConfigs();
        delete configs[widgetId];
        this.saveAllConfigs();
        // DEV_LOG && console.log(TAG, 'deleteConfig', widgetId);
    }

    /**
     * Get all widget IDs for a specific kind
     */
    static getInstancesOfKind(widgetKind: string): string[] {
        const configs = this.getAllConfigs(true);
        return Object.keys(configs).filter((id) => configs[id].widgetKind === widgetKind);
    }

    /**
     * Get update frequency
     */
    static getUpdateFrequency(): number {
        if (__ANDROID__) {
            const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
            return widgetManager.getUpdateFrequency(Utils.android.getApplicationContext());
        } else {
            DEV_LOG && console.log(TAG, 'getUpdateFrequency', ApplicationSettings.getNumber(UPDATE_FREQUENCY_KEY, DEFAULT_UPDATE_FREQUENCY));
            return ApplicationSettings.getNumber(UPDATE_FREQUENCY_KEY, DEFAULT_UPDATE_FREQUENCY);
        }
    }

    /**
     * Set update frequency and update native scheduling
     */
    static setUpdateFrequency(minutes: number): void {
        DEV_LOG && console.log(TAG, 'setUpdateFrequency', minutes, typeof minutes);

        if (__ANDROID__) {
            try {
                const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
                widgetManager.setUpdateFrequency(Utils.android.getApplicationContext(), minutes);
                // DEV_LOG && console.log(TAG, 'Updated Android WorkManager schedule with frequency:', minutes);
            } catch (error) {
                console.error(TAG, 'Failed to update Android WorkManager schedule:', error, error.stack);
            }
        } else if (__IOS__) {
            ApplicationSettings.setNumber(UPDATE_FREQUENCY_KEY, minutes);
            // try {
            //     DEV_LOG && console.log(TAG, 'Updated iOS refresh frequency preference:', minutes);
            // } catch (error) {
            //     console.error(TAG, 'Failed to update iOS refresh preference:', error, error.stack);
            // }
        }
    }

    /**
     * Get cache timeout in seconds (for deduplicating widget update requests)
     */
    static getCacheTimeout(): number {
        return ApplicationSettings.getNumber(CACHE_TIMEOUT_KEY, 60);
    }

    /**
     * Set cache timeout in seconds
     */
    static setCacheTimeout(seconds: number): void {
        // DEV_LOG && console.log(TAG, 'setCacheTimeout', seconds);
        ApplicationSettings.setNumber(CACHE_TIMEOUT_KEY, seconds);

        if (__ANDROID__) {
            try {
                widgetService.setCacheTimeout(seconds * 1000);
            } catch (error) {
                console.error(TAG, 'Failed to update widget service cache timeout:', error, error.stack);
            }
        }
    }

    /**
     * Get default settings from widget JSON schema
     */
    private static getDefaultSettings(widgetKind: string): Record<string, any> {
        // Load widget JSON to get settings schema
        try {
            // Widget JSON files define settings with defaults
            // For now, hardcode known settings - could be loaded from JSON files at runtime
            const settingsDefaults: Record<string, Record<string, any>> = {
                SimpleWeatherWithClockWidget: {
                    clockBold: true
                }
            };
            return settingsDefaults[widgetKind] || {};
        } catch (error) {
            console.error(TAG, 'Failed to load settings defaults for', widgetKind, error);
            return {};
        }
    }

    /**
     * Create default config with settings initialized from widget schema
     */
    // static createDefaultConfig(widgetKind?: string): WidgetConfig {
    //     const config: WidgetConfig = {
    //         locationName: 'current'
    //     };

    //     // Initialize settings from widget schema if widgetKind provided
    //     if (widgetKind) {
    //         config.widgetKind = widgetKind;
    //         config.settings = this.getDefaultSettings(widgetKind);
    //     }

    //     return config;
    // }
}
