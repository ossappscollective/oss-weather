import { Application } from '@nativescript/core';
import { widgetService } from '../WidgetBridge';
import { renderWidgetErrorIcon } from '../WidgetIcons';
import { classifyWidgetError, widgetErrorMessage } from '../WidgetError';

/**
 * Native BroadcastReceiver that can be registered in AndroidManifest.xml
 * Handles widget update requests even when app is not running
 */
@NativeClass()
@JavaProxy('com.akylas.weather.widgets.WidgetUpdateReceiver')
export class WidgetUpdateReceiver extends android.content.BroadcastReceiver {
    constructor() {
        super();
        return global.__native(this);
    }

    onReceive(context: android.content.Context, intent: android.content.Intent): void {
        try {
            const action = intent.getAction();

            // DEV_LOG && console.log(`WidgetUpdateReceiver: onReceive action=${action}`);
            if (action === 'com.akylas.weather.WIDGET_UPDATE_REQUEST') {
                const widgetId = intent.getIntExtra('widgetId', -1);

                if (widgetId === -1) {
                    console.warn('WidgetUpdateReceiver: Received update request with invalid widgetId');
                    return;
                }

                // DEV_LOG && console.log(`WidgetUpdateReceiver: Received update request for widgetId=${widgetId}`);
                // Set widget to loading state
                const widgetManager = com.akylas.weather.widgets.WeatherWidgetManager;
                widgetManager.setWidgetLoading(context, widgetId);

                // Then fetch data and update widget
                widgetService.updateWidget(widgetId + '').catch((error) => {
                    console.error(`WidgetUpdateReceiver: Error updating widget ${widgetId}:`, error, error.stack);
                    const isNetwork = classifyWidgetError(error) === 'network';
                    widgetManager.setWidgetError(context, widgetId, widgetErrorMessage(error), isNetwork, renderWidgetErrorIcon(isNetwork));
                });
            } else if (action === 'com.akylas.weather.WIDGET_ADDED') {
                const widgetId = intent.getIntExtra('widgetId', -1);
                // DEV_LOG && console.log(`WidgetUpdateReceiver: Widget added, widgetId=${widgetId}`);

                widgetService.reloadConfigs();

                Application.notify({ eventName: 'widgetAdded', widgetId });
            } else if (action === 'com.akylas.weather.WIDGET_REMOVED') {
                const widgetId = intent.getIntExtra('widgetId', -1);
                // DEV_LOG && console.log(`WidgetUpdateReceiver: Widget removed, widgetId=${widgetId}`);
                widgetService.reloadConfigs();
                Application.notify({ eventName: 'widgetRemoved', widgetId });
            }
        } catch (error) {
            console.error('WidgetUpdateReceiver: Error in onReceive:', error, error?.stack);
        }
    }
}
