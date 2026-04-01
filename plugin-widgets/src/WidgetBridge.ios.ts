import { WidgetConfig } from 'plugin-widgets/WidgetTypes';
import WidgetBridgeBase from './WidgetBridge.common';
import { WidgetConfigManager } from './WidgetConfigManager';
import { WidgetDataManager } from './WidgetDataManager';

const TAG = '[WidgetBridge.iOS]';

const groupId = WidgetUtils.suiteName;

/**
 * Bridge between native iOS widgets and JS weather data
 */
export class WidgetBridge extends WidgetBridgeBase {
    private dataManager: WidgetDataManager;

    constructor() {
        super();
        this.dataManager = new WidgetDataManager();
        this.setupAppGroupContainer();
        // this.observeWidgetEvents();
    }

    /**
     * Observe widget lifecycle events from extension
     */
    private widgetEventObserver: any;
    private widgetEventObserverCallbackFunctionRef: any;
    private observeWidgetEvents() {
        try {
            // Listen for Darwin notifications from widget extension
            this.widgetEventObserver = new interop.Reference<any>(interop.types.void);
            this.widgetEventObserverCallbackFunctionRef = new interop.FunctionReference(observerCallback);
            CFNotificationCenterAddObserver(
                CFNotificationCenterGetDarwinNotifyCenter(),
                this.widgetEventObserver,
                this.widgetEventObserverCallbackFunctionRef,
                'com.akylas.weather.widgetEvent',
                null,
                CFNotificationSuspensionBehavior.DeliverImmediately
            );

            DEV_LOG && console.log(TAG, 'Started observing widget events');
        } catch (error) {
            console.error(TAG, 'Failed to setup widget event observer:', error, error.stack);
        }
    }

    /**
     * Handle widget event from extension
     */
    public handleWidgetEvent() {
        try {
            const data = WidgetUtils.dataForKey('last_widget_event');
            if (data) {
                const json = NSString.alloc().initWithDataEncoding(data, NSUTF8StringEncoding);
                const event = JSON.parse(json.toString());

                DEV_LOG && console.log(TAG, 'Widget event received:', event);

                if (event.event === 'widgetAdded') {
                    this.onWidgetAdded(event.widgetId);
                } else if (event.event === 'widgetRemoved') {
                    this.onWidgetRemoved(event.widgetId);
                }
            }
        } catch (error) {
            console.error(TAG, 'Error handling widget event:', error, error.stack);
        }
    }

    /**
     * Setup App Group container for sharing data with widgets
     */
    private setupAppGroupContainer() {
        // Ensure App Group directory exists
        const fileManager = NSFileManager.defaultManager;
        const containerURL = fileManager.containerURLForSecurityApplicationGroupIdentifier(groupId);

        if (containerURL) {
            const widgetDataDir = containerURL.URLByAppendingPathComponent('WidgetData');

            if (!fileManager.fileExistsAtPath(widgetDataDir.path)) {
                try {
                    fileManager.createDirectoryAtURLWithIntermediateDirectoriesAttributesError(widgetDataDir, true, null);
                    DEV_LOG && console.log(TAG, 'Created WidgetData directory in App Group');
                } catch (error) {
                    console.error(TAG, 'Failed to create WidgetData directory:', error, error.stack);
                }
            }
        } else {
            console.error(TAG, 'App Group container not available');
        }
    }

    /**
     * Update all widgets with latest data
     */
    async updateAllWidgets(onlyDefaults = false) {
        DEV_LOG && console.log(TAG, `updateAllWidgets called (onlyDefaults=${onlyDefaults})`);

        const configs = WidgetConfigManager.getAllConfigs();
        const widgetIds = Object.keys(configs);

        if (widgetIds.length === 0) {
            DEV_LOG && console.log(TAG, 'No widgets to update');
            return;
        }

        for (const widgetId of widgetIds) {
            try {
                const config = configs[widgetId];
                this.updateWidget(widgetId, config);
            } catch (error) {
                console.error(TAG, `Error updating widget ${widgetId}:`, error, error.stack);
            }
        }

        // Reload all widget timelines
        this.reloadAllWidgetTimelines();
    }

    /**
     * Update specific widget
     */
    async updateWidget(widgetId: string, config = WidgetConfigManager.getConfig(widgetId)) {
        DEV_LOG && console.log(TAG, `updateWidget ${widgetId}`);

        try {
            // Set loading state
            this.setWidgetLoading(widgetId);

            // Fetch and format weather data using shared data manager
            const widgetData = await this.dataManager.getWidgetWeatherData(config);

            if (!widgetData) {
                console.warn(TAG, `No weather data available for widget ${widgetId}`);
                // Write null data to show "no location set" message
                this.setWidgetError(widgetId, 'could not load data');
                return;
            }

            // Write data to App Group container
            this.saveWidgetData(widgetId, {
                ...widgetData,
                loadingState: 'loaded'
            });

            DEV_LOG && console.log(TAG, `Widget ${widgetId} updated successfully`);
        } catch (error) {
            console.error(TAG, `Error updating widget ${widgetId}:`, error, error.stack);
            // Write null on error so widget shows fallback
            this.setWidgetError(widgetId, error.message || 'Unknown error');
        }
    }

    /**
     * Sync update frequency to App Group for widgets
     */
    private syncUpdateFrequency() {
        try {
            const frequency = WidgetConfigManager.getUpdateFrequency();
            const userDefaults = NSUserDefaults.alloc().initWithSuiteName(groupId);

            if (userDefaults) {
                userDefaults.setIntegerForKey(frequency, 'widget_update_frequency');
                userDefaults.synchronize();
                console.log(`WidgetBridge: Synced update frequency to iOS: ${frequency} minutes`);
            }
        } catch (error) {
            console.error('WidgetBridge: Failed to sync update frequency:', error, error.stack);
        }
    }

    /**
     * Update frequency changed - sync to widgets
     */
    onUpdateFrequencyChanged(frequency: number) {
        try {
            WidgetUtils.setValueForKey(frequency, 'widget_update_frequency');
            // Reload all widget timelines to pick up new frequency
            WidgetUtils.reloadAllTimelines();

            console.log(`WidgetBridge: Updated widget frequency to ${frequency} minutes`);
        } catch (error) {
            console.error('WidgetBridge: Failed to update frequency:', error, error.stack);
        }
    }

    private saveWidgetData(widgetId: string, data: any) {
        try {
            const fileManager = NSFileManager.defaultManager;
            const appGroupId = groupId;
            const containerURL = fileManager.containerURLForSecurityApplicationGroupIdentifier(appGroupId);

            if (!containerURL) {
                console.error('WidgetBridge: Failed to get App Group container');
                return;
            }

            const widgetDataDir = containerURL.URLByAppendingPathComponent('WidgetData');

            // Create directory if needed
            if (!fileManager.fileExistsAtPath(widgetDataDir.path)) {
                fileManager.createDirectoryAtURLWithIntermediateDirectoriesAttributesError(widgetDataDir, true, null);
            }

            const dataFile = widgetDataDir.URLByAppendingPathComponent(`widget_${widgetId}.json`);
            const jsonString = JSON.stringify(data);
            const nsString = NSString.stringWithString(jsonString);

            nsString.writeToFileAtomicallyEncodingError(dataFile.path, true, NSUTF8StringEncoding);

            console.log(`WidgetBridge: Saved data for widget ${widgetId}`);
        } catch (error) {
            console.error('WidgetBridge: Failed to save widget data:', error, error.stack);
        }
    }

    private setWidgetLoading(widgetId: string) {
        const loadingData = {
            temperature: '',
            iconPath: '',
            description: '',
            locationName: '',
            date: '',
            hourlyData: [],
            dailyData: [],
            forecastData: [],
            lastUpdate: Date.now() / 1000,
            loadingState: 'loading',
            errorMessage: ''
        };

        this.saveWidgetData(widgetId, loadingData);
        this.reloadWidget(widgetId);
    }

    /**
     * Get widget kind from widget ID
     * Widget IDs are generated as "widget_{family}_{kind}.hashValue"
     */
    private getWidgetKind(widgetId: string): string | null {
        try {
            // Try to get from active widgets stored by WidgetLifecycleManager
            const data = WidgetUtils.dataForKey('active_widgets');
            if (data) {
                const json = NSString.alloc().initWithDataEncoding(data, NSUTF8StringEncoding);
                const activeWidgets = JSON.parse(json.toString());

                if (activeWidgets[widgetId]) {
                    return activeWidgets[widgetId];
                }
            }

            // Fallback: try to parse from widget ID pattern
            // Widget IDs follow pattern: hash of "widget_{family}_{kind}"
            // We can store this mapping when widget is configured
            const config = WidgetConfigManager.getConfig(widgetId);
            if (config && config.widgetKind) {
                return config.widgetKind;
            }

            return null;
        } catch (error) {
            console.error(TAG, 'Error getting widget kind:', error, error.stack);
            return null;
        }
    }

    /**
     * Reload specific widget timeline
     */
    reloadWidgetTimeline(widgetKind: string) {
        try {
            WidgetUtils.reloadTimelinesOfKind(widgetKind);
            DEV_LOG && console.log(TAG, `Reloaded widget timeline: ${widgetKind}`);
        } catch (error) {
            console.error(TAG, `Error reloading widget timeline ${widgetKind}:`, error, error.stack);
        }
    }

    /**
     * Reload specific widget by ID
     * Maps widget ID to widget kind and reloads that timeline
     */
    private reloadWidget(widgetId: string) {
        try {
            // Get widget kind from configuration
            const widgetKind = this.getWidgetKind(widgetId);

            if (widgetKind) {
                // Reload specific widget kind
                this.reloadWidgetTimeline(widgetKind);
            } else {
                // Fallback to reload all if we can't determine the kind
                WidgetUtils.reloadAllTimelines();
                DEV_LOG && console.log(TAG, `Reloaded all widgets (couldn't determine kind for id: ${widgetId})`);
            }
        } catch (error) {
            console.error(TAG, 'Failed to reload widget:', error, error.stack);
        }
    }

    /**
     * Get widget kinds that support a specific family size
     */
    private getWidgetKindsForFamily(family: 'small' | 'medium' | 'large'): string[] {
        const allKinds = [
            'SimpleWeatherWidget', // small, medium
            'SimpleWeatherWithDateWidget', // medium
            'SimpleWeatherWithClockWidget', // medium
            'HourlyWeatherWidget', // medium, large
            'DailyWeatherWidget', // medium, large
            'ForecastWeatherWidget' // large
        ];

        const familyMap = {
            small: ['SimpleWeatherWidget'],
            medium: ['SimpleWeatherWidget', 'SimpleWeatherWithDateWidget', 'SimpleWeatherWithClockWidget', 'HourlyWeatherWidget', 'DailyWeatherWidget'],
            large: ['HourlyWeatherWidget', 'DailyWeatherWidget', 'ForecastWeatherWidget']
        };

        return familyMap[family] || [];
    }
    /**
     * Reload widgets by family (small, medium, large)
     */
    reloadWidgetsByFamily(family: 'small' | 'medium' | 'large') {
        try {
            // Get all widget kinds that support this family
            const widgetKinds = this.getWidgetKindsForFamily(family);

            for (const kind of widgetKinds) {
                WidgetUtils.reloadTimelinesOfKind(kind);
            }

            DEV_LOG && console.log(TAG, `Reloaded ${widgetKinds.length} widget kinds for family: ${family}`);
        } catch (error) {
            console.error(TAG, `Error reloading widgets for family ${family}:`, error, error.stack);
        }
    }

    private setWidgetError(widgetId: string, error: string) {
        const errorData = {
            temperature: '',
            iconPath: '',
            description: '',
            locationName: '',
            date: '',
            hourlyData: [],
            dailyData: [],
            forecastData: [],
            lastUpdate: Date.now() / 1000,
            loadingState: 'error',
            errorMessage: error
        };

        this.saveWidgetData(widgetId, errorData);
        this.reloadWidget(widgetId);
    }

    /**
     * Called when a widget is added
     */
    onWidgetAdded(widgetId: string) {
        DEV_LOG && console.log(TAG, `onWidgetAdded: ${widgetId}`);

        // Schedule background refresh if this is the first widget
        const configs = WidgetConfigManager.getAllConfigs();
        if (Object.keys(configs).length === 1) {
            const frequency = WidgetConfigManager.getUpdateFrequency();
            this.scheduleWidgetRefresh(frequency);
        }

        // Update the widget immediately
        this.updateWidget(widgetId);
    }

    /**
     * Called when a widget is removed
     */
    onWidgetRemoved(widgetId: string) {
        DEV_LOG && console.log(TAG, `onWidgetRemoved: ${widgetId}`);

        // Remove widget data file
        this.removeWidgetData(widgetId);

        // If no more widgets, we can't really "cancel" iOS background refresh
        // but we can note it for when handleBackgroundRefresh is called
        const configs = WidgetConfigManager.getAllConfigs();
        if (Object.keys(configs).length === 0) {
            DEV_LOG && console.log(TAG, 'No more widgets, background refresh will skip updates');
        }
    }

    /**
     * Get icon path for iOS - copy to App Group container
     */
    private getIconPath(iconName: string, iconTheme: string): string {
        if (!iconName) return '';

        try {
            const appGroupId = groupId;
            const fileManager = NSFileManager.defaultManager;
            const containerURL = fileManager.containerURLForSecurityApplicationGroupIdentifier(appGroupId);

            if (!containerURL) {
                console.error('App Group container not available');
                return '';
            }

            // Create icons directory in App Group
            const iconsDir = containerURL.URLByAppendingPathComponent('WidgetData/icons');
            if (!fileManager.fileExistsAtPath(iconsDir.path)) {
                fileManager.createDirectoryAtURLWithIntermediateDirectoriesAttributesError(iconsDir, true, null);
            }

            const iconFileName = `${iconTheme}_${iconName}.png`;
            const destinationURL = iconsDir.URLByAppendingPathComponent(iconFileName);

            // Check if icon already copied
            if (fileManager.fileExistsAtPath(destinationURL.path)) {
                return destinationURL.path;
            }

            // Find icon in app bundle
            const bundle = NSBundle.mainBundle;
            let iconPath = bundle.pathForResourceOfTypeInDirectory(iconName, 'png', `assets/icon_themes/${iconTheme}`);

            // Fallback to default theme
            if (!iconPath) {
                iconPath = bundle.pathForResourceOfTypeInDirectory(iconName, 'png', 'assets/icon_themes/default');
            }

            if (iconPath) {
                const sourceURL = NSURL.fileURLWithPath(iconPath);
                fileManager.copyItemAtURLToURLError(sourceURL, destinationURL);
                return destinationURL.path;
            }

            return '';
        } catch (error) {
            console.error(`Error copying icon ${iconName}:`, error, error.stack);
            return '';
        }
    }

    /**
     * Remove widget data file from App Group container
     */
    private removeWidgetData(widgetId: string) {
        try {
            const appGroupId = groupId;
            const fileManager = NSFileManager.defaultManager;
            const containerURL = fileManager.containerURLForSecurityApplicationGroupIdentifier(appGroupId);

            if (!containerURL) return;

            const dataFile = containerURL.URLByAppendingPathComponent('WidgetData').URLByAppendingPathComponent(`widget_${widgetId}.json`);

            if (fileManager.fileExistsAtPath(dataFile.path)) {
                fileManager.removeItemAtURLError(dataFile);
                DEV_LOG && console.log(TAG, `Removed widget data for ${widgetId}`);
            }
        } catch (error) {
            console.error(TAG, `Error removing widget data for ${widgetId}:`, error, error.stack);
        }
    }

    /**
     * Reload all widget timelines to show updated data
     */
    private reloadAllWidgetTimelines() {
        try {
            // Use WidgetCenter to reload all timelines
            WidgetUtils.reloadAllTimelines();
            DEV_LOG && console.log(TAG, 'Reloaded all widget timelines');
        } catch (error) {
            console.error(TAG, 'Error reloading widget timelines:', error, error.stack);
        }
    }

    /**
     * Schedule background refresh for widgets
     */
    scheduleWidgetRefresh(intervalMinutes: number) {
        DEV_LOG && console.log(TAG, `scheduleWidgetRefresh: ${intervalMinutes} minutes`);

        // iOS handles widget refresh through Background App Refresh
        // We store the interval but can't directly control when iOS refreshes
        // iOS will call our background refresh handler when it decides to

        // Store the interval for reference
        WidgetConfigManager.setUpdateFrequency(intervalMinutes);
    }

    public saveWidgetConfig(widgetId: string, config: WidgetConfig) {
        // TODO: implement saveWidgetConfig
        DEV_LOG && console.log('saveWidgetConfig', widgetId, config);
        // WidgetConfigManager.saveWidgetConfig(parseInt(widgetId, 10), config ? JSON.stringify(config) : null);
    }

    /**
     * Cleanup
     */
    public destroy() {
        // Remove observer
        if (this.widgetEventObserver) {
            const center = CFNotificationCenterGetDarwinNotifyCenter();
            CFNotificationCenterRemoveObserver(center, this.widgetEventObserver, null, null);
        }
    }
}
export const widgetService = new WidgetBridge();
function observerCallback(center, observer, name, object, userInfo) {
    widgetService.handleWidgetEvent();
}
