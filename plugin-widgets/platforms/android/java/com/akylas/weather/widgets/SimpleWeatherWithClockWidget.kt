package com.akylas.weather.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import com.akylas.weather.widgets.WeatherWidgetGlanceReceiver.Companion.registerThemeChangeReceiver
import kotlinx.serialization.json.*
import androidx.compose.ui.graphics.Color
import androidx.core.graphics.toColorInt
import androidx.glance.unit.ColorProvider

private const val LOG_TAG = "SimpleWeatherWithClockWidget"

class SimpleWeatherWithClockWidget : WeatherWidget() {

    override val sizeMode = SizeMode.Responsive(
        setOf(
            // DpSize(100.dp, 100.dp),
            DpSize(150.dp, 100.dp),
            DpSize(200.dp, 100.dp),
            DpSize(200.dp, 200.dp),
            DpSize(250.dp, 200.dp),
            DpSize(250.dp, 200.dp),
            DpSize(300.dp, 100.dp),
            DpSize(300.dp, 200.dp),
        )
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        WidgetsLogger.d(LOG_TAG, "provideGlance(glanceId=$id)")
        setupUpdateWorker(context)
        registerThemeChangeReceiver(context);

        // Initialize caches to populate StateFlows
        WeatherWidgetManager.loadWidgetDataCache(context)
        WeatherWidgetManager.getAllWidgetConfigs(context) // Initializes WidgetConfigStore
        val widgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)

        val settingsFlow = WidgetConfigStore.getWidgetSettingsFlow(widgetId)
        val dataFlow = WidgetDataStore.getWidgetDataFlow(widgetId)

        provideContent {

            // Observe widget data from StateFlow - triggers automatic recomposition
            val widgetDataWithVersion by dataFlow.collectAsState()
            val widgetData = widgetDataWithVersion.first
            
            // Observe only this widget's settings - prevents unnecessary recomposition from other widgets
            val widgetSettings by settingsFlow.collectAsState()
            val widgetConfig = WidgetConfig(settings = widgetSettings)
      
            val backgroundColor = widgetConfig.settings?.get("backgroundColor")?.jsonPrimitive?.contentOrNull

            GlanceTheme(colors = WidgetTheme.colors) {
                WidgetComposables.WidgetBackground(
                    enabled = !(widgetConfig.settings?.get("transparent")?.jsonPrimitive?.booleanOrNull ?: false),
                    color = if (backgroundColor != null) ColorProvider(Color(backgroundColor.toColorIntRgba())) else null
                ) {
                    if (widgetData == null || widgetData!!.loadingState == WidgetLoadingState.NONE) {
                        WidgetComposables.NoDataContent()
                    } else if (widgetData!!.loadingState == WidgetLoadingState.LOADING) {
                        WidgetComposables.NoDataContent(WidgetLoadingState.LOADING)
                    } else if (widgetData!!.loadingState == WidgetLoadingState.ERROR) {
                        WidgetComposables.NoDataContent(
                            WidgetLoadingState.ERROR,
                            widgetData!!.errorMessage
                        )
                    } else {
                        WeatherContent(config = widgetConfig, data = widgetData!!)
                    }
                }
            }
        }
    }


    @Composable
    private fun WeatherContent(
        config: WidgetConfig = WidgetConfig(),
        data: WeatherWidgetData
    ) {
        WidgetsLogger.d(LOG_TAG, "Rendering weather with clock for ${data.locationName}")
        
        // Use the generated content from JSON layout definition
        com.akylas.weather.widgets.generated.SimpleWeatherWithClockWidgetContent(
            config = config,
            data = data,
        )
    }
}