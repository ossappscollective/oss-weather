declare namespace com {
    export namespace akylas {
        export namespace weather {
            export namespace widgets {
                export class AnimatableIconView extends globalAndroid.widget.FrameLayout {}
                export class WeatherWidgetManager {
                    static onWidgetAdded(activity: androidx.appcompat.app.AppCompatActivity, widgetId: number) {
                        throw new Error('Method not implemented.');
                    }
                    static requestWidgetUpdate<WidgetConfigActivityCallbacksImplementation extends WidgetConfigActivityCallbacksImplementation>(arg0: this, widgetId: number);
                    static sendWidgetAdded<WidgetConfigActivityCallbacksImplementation extends WidgetConfigActivityCallbacksImplementation>(arg0: this, appWidgetId: number);
                    static addActiveWidget<WidgetConfigActivityCallbacksImplementation extends WidgetConfigActivityCallbacksImplementation>(arg0: this, appWidgetId: number);
                    static loadWidgetConfig<WidgetConfigActivityCallbacksImplementation extends WidgetConfigActivityCallbacksImplementation>(arg0: this, appWidgetId: number, canCreate: boolean);
                    static setWidgetError(context: globalAndroid.content.Context, widgetId: number, arg2: any);
                    static setWidgetLoading(context: globalAndroid.content.Context, widgetId: number);
                    static updateWidgetData(context: globalAndroid.content.Context, widgetId: number, data: string);
                    static getAllActiveWidgetIds(context: globalAndroid.content.Context): java.util.List<string>;
                    static setUpdateFrequency(context: globalAndroid.content.Context, minutes: number);
                }
                export class WidgetLocalizationProvider {
                    static setStrings(context: globalAndroid.content.Context, ...args: string[]);
                }
            }
        }
    }
}
