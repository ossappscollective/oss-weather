// app/services/widgets/android/AndroidWidgetBridge.ts
// Android-specific widget bridge using shared logic

import { Utils } from '@nativescript/core';
import { classifyWidgetError, widgetErrorMessage } from '~/utils/widgetError';
import { createUpdateDeduper } from '~/utils/widgetUpdates';
import WidgetBridgeBase from './WidgetBridge.common';
import { WidgetConfigManager } from './WidgetConfigManager';
import { WidgetDataManager, isDefaultLocation } from './WidgetDataManager';
import { renderWidgetErrorIcon } from './WidgetIcons';
import { WeatherWidgetData, WidgetConfig } from './WidgetTypes';

/**
 * Bridge between native Android widgets and JS weather data
 */
export class WidgetBridge extends WidgetBridgeBase {
    private dataManager: WidgetDataManager;
    private updates = createUpdateDeduper<WeatherWidgetData>();
    private lastUpdateTime: Map<string, number> = new Map();
    private cacheTimeoutMs: number = 60000; // 1 minute cache by default

    constructor() {
        super();

        const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
        const context = Utils.android.getApplicationContext();
        this.dataManager = new WidgetDataManager();

        widgetManager.checkActiveWidgets(context);

        const cacheTimeoutSeconds = WidgetConfigManager.getCacheTimeout();
        this.cacheTimeoutMs = cacheTimeoutSeconds * 1000;
    }

    /**
     * Set cache timeout for deduplicating widget update requests
     */
    public setCacheTimeout(ms: number) {
        this.cacheTimeoutMs = ms;
    }

    /**
     * Update all widgets with latest data
     */
    async updateAllWidgets(onlyDefaults = false) {
        // DEV_LOG && console.info('updateAllWidgets', { onlyDefaults });
        const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
        const context = Utils.android.getApplicationContext();

        // Get all active widget IDs
        const activeWidgetIds = widgetManager.getAllActiveWidgetIds(context);
        const idsArray = [];
        for (let i = 0; i < activeWidgetIds.size(); i++) {
            idsArray.push(activeWidgetIds.get(i));
        }

        // DEV_LOG && console.log('Active widgets:', idsArray);

        // Filter widgets based on onlyDefaults flag
        const widgetsToUpdate = onlyDefaults
            ? idsArray.filter((widgetId) => {
                  const config = WidgetConfigManager.getConfig(String(widgetId));
                  return config && isDefaultLocation(config.locationName);
              })
            : idsArray;

        // DEV_LOG && console.log('Widgets to update:', widgetsToUpdate);

        // Update each widget (with deduplication)
        await Promise.all(widgetsToUpdate.map((widgetId) => this.updateWidget(String(widgetId))));
    }

    /**
     * Update widgets for a specific location
     */
    async updateWidgetsForLocation(locationName: string) {
        // DEV_LOG && console.info('updateWidgetsForLocation', locationName);
        const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
        const context = Utils.android.getApplicationContext();

        // Get all active widget IDs
        const activeWidgetIds = widgetManager.getAllActiveWidgetIds(context);
        const idsArray = [];
        for (let i = 0; i < activeWidgetIds.size(); i++) {
            idsArray.push(activeWidgetIds.get(i));
        }

        // Filter widgets using this location
        const widgetsToUpdate = idsArray.filter((widgetId) => {
            const config = WidgetConfigManager.getConfig(String(widgetId));
            if (!config) return false;

            // Check if widget uses this location
            if (isDefaultLocation(locationName) && isDefaultLocation(config.locationName)) {
                return true; // Both are default/current location
            }
            return config.locationName === locationName;
        });

        // DEV_LOG && console.log('Widgets using location:', widgetsToUpdate);

        // Update each widget (with deduplication)
        await Promise.all(widgetsToUpdate.map((widgetId) => this.updateWidget(String(widgetId))));
    }

    /**
     * Handle widget update request from native side with deduplication
     */
    async updateWidget(widgetId: string, config = WidgetConfigManager.getConfig(widgetId)) {
        try {
            // DEV_LOG && console.info('updateWidget', widgetId, config);

            // If no config exists, this might be a newly added widget
            // Try to create instance config from kind defaults
            if (!config || !config.widgetKind) {
                // Widget was added but we don't know its kind yet
                // This will be handled by the native side calling with widgetKind
                throw new Error(`No configuration found for widget ${widgetId}`);
            }

            // Generate cache key based on the resolved location, provider and model to deduplicate requests
            const cacheKey = this.dataManager.sourceKey(config);

            // Widgets on the same location share one fetch
            const widgetData = await this.updates.run(cacheKey, () => this.dataManager.getWidgetWeatherData(config));
            this.sendWeatherDataToWidget(parseInt(widgetId, 10), widgetData);
            this.lastUpdateTime.set(cacheKey, Date.now());
        } catch (error) {
            console.error(`Error updating widget ${widgetId}:`, error, error.stack);
            const isNetwork = classifyWidgetError(error) === 'network';
            // a network failure is not worth an error screen while the cached weather is still good enough
            const staleData = isNetwork && config?.widgetKind ? this.dataManager.getStaleWidgetWeatherData(config) : null;
            if (staleData) {
                this.sendWeatherDataToWidget(parseInt(widgetId, 10), staleData);
                return;
            }
            // without this the widget stays on its loading state forever
            const context = Utils.android.getApplicationContext();
            com.akylas.weather.widgets.WeatherWidgetManager.setWidgetError(context, parseInt(widgetId, 10), widgetErrorMessage(error), isNetwork, renderWidgetErrorIcon(isNetwork));
        }
    }

    /**
     * Send formatted weather data to native widget
     */
    private sendWeatherDataToWidget(widgetId: number, data: WeatherWidgetData) {
        try {
            // DEV_LOG && console.log('sendWeatherDataToWidget', widgetId, JSON.stringify(data));
            const context = Utils.android.getApplicationContext();
            const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
            // Update widget
            widgetManager.updateWidgetData(context, widgetId, data ? JSON.stringify(data) : null);
        } catch (error) {
            console.error('Error sending data to widget:', error, error.stack);
        }
    }

    public saveWidgetConfig(widgetId: string, config: WidgetConfig) {
        const context = Utils.android.getApplicationContext();
        const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
        // DEV_LOG && console.log('saveWidgetConfig', widgetId, config);
        widgetManager.saveWidgetConfigString(context, parseInt(widgetId, 10), config ? JSON.stringify(config) : null);
    }

    /**
     * Cleanup
     */
    public destroy() {
        this.updates.clear();
        this.lastUpdateTime.clear();
    }
}
export const widgetService = new WidgetBridge();
