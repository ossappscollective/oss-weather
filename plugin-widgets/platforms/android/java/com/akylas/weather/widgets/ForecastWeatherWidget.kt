package com.akylas.weather.widgets

import android.annotation.SuppressLint
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.components.Scaffold
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.layout.*
import androidx.glance.preview.ExperimentalGlancePreviewApi
import androidx.glance.preview.Preview
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.akylas.weather.widgets.WeatherWidgetGlanceReceiver.Companion.registerThemeChangeReceiver
import com.akylas.weather.widgets.generated.HourlyWeatherWidgetContent
import kotlinx.serialization.json.*
import androidx.compose.ui.graphics.Color
import com.akylas.weather.widgets.toColorIntRgba
import androidx.glance.unit.ColorProvider

private const val LOG_TAG = "ForecastWeatherWidget"

class ForecastWeatherWidget : WeatherWidget() {
    
    override val sizeMode = SizeMode.Responsive(
        setOf(
            DpSize(260.dp, 200.dp),
            DpSize(260.dp, 280.dp)
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
            val widgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)

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
        data: WeatherWidgetData,
    ) {
        // Use the generated content from JSON layout definition
        com.akylas.weather.widgets.generated.ForecastWeatherWidgetContent(
            config = config,
            data = data,
        )
    }
}