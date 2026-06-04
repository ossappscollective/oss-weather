// app/services/widgets/android/AndroidWidgetBridge.ts
// Android-specific widget bridge using shared logic

import { Utils } from '@nativescript/core';
import WidgetBridgeBase from './WidgetBridge.common';
import { WidgetConfigManager } from './WidgetConfigManager';
import { WidgetDataManager, isDefaultLocation } from './WidgetDataManager';
import { WeatherWidgetData, WidgetConfig } from './WidgetTypes';

/**
 * Bridge between native Android widgets and JS weather data
 */
export class WidgetBridge extends WidgetBridgeBase {
    private dataManager: WidgetDataManager;
    private pendingUpdates: Map<string, Promise<WeatherWidgetData>> = new Map();
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

            // Generate cache key based on location to deduplicate requests for same location
            const cacheKey = `${config.locationName}_${config.latitude}_${config.longitude}_${config.provider}_${config.model}`;
            const now = Date.now();
            const lastUpdate = this.lastUpdateTime.get(cacheKey) || 0;

            // Check if there's a pending update for this location
            if (this.pendingUpdates.has(cacheKey)) {
                // DEV_LOG && console.log(`Reusing pending update for ${cacheKey}`);
                const widgetData = await this.pendingUpdates.get(cacheKey);
                this.sendWeatherDataToWidget(parseInt(widgetId, 10), widgetData);
                return;
            }

            // Check if we have recent cached data
            // if (now - lastUpdate < this.cacheTimeoutMs) {
            //     DEV_LOG && console.log(`Using cached data for ${cacheKey} (${now - lastUpdate}ms old)`);
            //     return;
            // }

            // Create update promise
            const updatePromise = this.performWidgetUpdate(widgetId, config, cacheKey);

            // Store pending update
            this.pendingUpdates.set(cacheKey, updatePromise);

            // Wait for update to complete
            await updatePromise;

            // Clean up pending update
            this.pendingUpdates.delete(cacheKey);

            // Update last update time
            this.lastUpdateTime.set(cacheKey, Date.now());
        } catch (error) {
            console.error(`Error updating widget ${widgetId}:`, error, error.stack);
        }
    }

    /**
     * Perform the actual widget update
     */
    private async performWidgetUpdate(widgetId: string, config: WidgetConfig, cacheKey: string) {
        // DEV_LOG && console.log(`Fetching weather data for ${cacheKey}`);

        // Fetch and format weather data using shared data manager
        const widgetData = await this.dataManager.getWidgetWeatherData(config);

        // Send data back to native
        this.sendWeatherDataToWidget(parseInt(widgetId, 10), widgetData);
        return widgetData;
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
        this.pendingUpdates.clear();
        this.lastUpdateTime.clear();
    }
}
export const widgetService = new WidgetBridge();
