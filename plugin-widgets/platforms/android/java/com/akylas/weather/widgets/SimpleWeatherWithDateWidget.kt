package com.akylas.weather.widgets

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
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.components.Scaffold
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.layout.*
import androidx.glance.preview.ExperimentalGlancePreviewApi
import androidx.glance.preview.Preview
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.akylas.weather.widgets.WeatherWidgetGlanceReceiver.Companion.registerThemeChangeReceiver
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.*
import androidx.compose.ui.graphics.Color
import com.akylas.weather.widgets.toColorIntRgba
import androidx.glance.unit.ColorProvider

private const val LOG_TAG = "SimpleWeatherWithDateWidget"

class SimpleWeatherWithDateWidget : WeatherWidget() {

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

    class WeatherWidgetDateWorker(
        appContext: Context,
        params: WorkerParameters
    ) : CoroutineWorker(appContext, params) {
        override suspend fun doWork(): Result {
            SimpleWeatherWithDateWidget().apply { updateAll(applicationContext) }
            return Result.success()
        }
    }

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        WidgetsLogger.d(LOG_TAG, "provideGlance(glanceId=$id)")
        setupUpdateWorker(context)
        registerThemeChangeReceiver(context);

        // Create unique periodic work to keep this widget updated at a regular interval.
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_YEAR, 1)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        var delayUntilNextDay = calendar.timeInMillis - System.currentTimeMillis()
        if (delayUntilNextDay < 10000L) {
            delayUntilNextDay = 10000L
        }
        // Create unique periodic work to keep this widget updated at a regular interval.
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "weatherDateWidgetWorker",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequest.Builder(
                WeatherWidgetDateWorker::class.java,
                1, TimeUnit.DAYS
            ).setInitialDelay(delayUntilNextDay, TimeUnit.MILLISECONDS).build()
        )

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
        data: WeatherWidgetData,
    ) {
        // Use the generated content from JSON layout definition
        com.akylas.weather.widgets.generated.SimpleWeatherWithDateWidgetContent(
            config = config,
            data = data,
        )
    }
}