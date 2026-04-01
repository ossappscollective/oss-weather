import { Application } from '@nativescript/core';
import { widgetService } from '../WidgetBridge';
import { WidgetConfigManager } from '../WidgetConfigManager';
import { SDK_VERSION } from '@nativescript/core/utils';

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
                    widgetManager.setWidgetError(context, widgetId, error.message || 'Update failed');
                });
            } else if (action === 'com.akylas.weather.WIDGET_ADDED') {
                const widgetId = intent.getIntExtra('widgetId', -1);
                // DEV_LOG && console.log(`WidgetUpdateReceiver: Widget added, widgetId=${widgetId}`);

                widgetService.reloadConfigs();

                // Request SCHEDULE_EXACT_ALARM permission for clock widgets on Android 12+
                if (widgetId !== -1 && SDK_VERSION >= 31) {
                    // Android 12+
                    try {
                        const config = WidgetConfigManager.getConfig(String(widgetId));

                        if (config && config.widgetKind.indexOf('Clock') !== -1) {
                            DEV_LOG && console.log(`WidgetUpdateReceiver: Widget clock added, widgetId=${widgetId}`);
                            const alarmManager = context.getSystemService(android.content.Context.ALARM_SERVICE) as android.app.AlarmManager;

                            if (!alarmManager.canScheduleExactAlarms()) {
                                console.log('WidgetUpdateReceiver: Clock widget added but SCHEDULE_EXACT_ALARM not granted, opening settings');

                                // Open settings to allow user to grant the permission
                                const intent = new android.content.Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                                intent.setData(android.net.Uri.parse(`package:${__APP_ID__}`));
                                const activity = Application.android.startActivity;
                                activity.startActivity(intent);
                            }
                        }
                    } catch (error) {
                        console.error('WidgetUpdateReceiver: Error checking clock permission:', error);
                    }
                }
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
