package com.akylas.weather.widgets

import android.content.BroadcastReceiver
import android.content.Context
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.akylas.weather.widgets.WeatherWidgetManager.getUpdateFrequency
import java.util.concurrent.TimeUnit
import kotlin.time.Duration.Companion.minutes
import kotlin.time.toJavaDuration

private const val LOG_TAG = "JS"
abstract class WeatherWidget : GlanceAppWidget() {
    class WeatherWidgetWorker(
        appContext: Context,
        params: WorkerParameters
    ) : CoroutineWorker(appContext, params) {
        override suspend fun doWork(): Result {
            WidgetsLogger.d(LOG_TAG, "WeatherWidgetWorker update")
            WeatherWidgetManager.requestAllWidgetsUpdate(applicationContext)

            return Result.success()
        }
    }

    fun setupUpdateWorker(context: Context) {
        WidgetsLogger.d(LOG_TAG, "setupUpdateWorker for class; ${this.javaClass.simpleName}")
        var frequency = getUpdateFrequency(context)

        // WorkManager enforces a minimum periodic interval (≈15 minutes).
        // Clamp to 15 minutes to avoid silent no-op.
        val minMinutes = 15L
        if (frequency < minMinutes) {
            WidgetsLogger.d(LOG_TAG, "Requested frequency $frequency min is below WorkManager minimum; using $minMinutes min for periodic scheduling and enqueueing a one-time worker for immediate testing.")
            // enqueue a one-time work for immediate test run
            // val oneTime = androidx.work.OneTimeWorkRequestBuilder<WeatherWidgetWorker>().build()
            // WorkManager.getInstance(context.applicationContext).enqueue(oneTime)
            frequency = minMinutes
        }

        // Use applicationContext and REPLACE so updates to frequency/params actually replace the existing job.
        WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
            "weatherWidgetUpdateWorker",
            ExistingPeriodicWorkPolicy.REPLACE,
            androidx.work.PeriodicWorkRequestBuilder<WeatherWidgetWorker>(frequency, java.util.concurrent.TimeUnit.MINUTES)
                .setInitialDelay(frequency, java.util.concurrent.TimeUnit.MINUTES)
                .build()
        )
    }

    suspend fun logUpdateWorkerState(context: Context) {
        val infos = WorkManager.getInstance(context.applicationContext)
            .getWorkInfosForUniqueWork("weatherWidgetUpdateWorker")
            .get() // call from coroutine or background thread
        for (info in infos) {
            WidgetsLogger.i(LOG_TAG, "weatherWidgetUpdateWorker state=${info.state}, nextRun=${info.nextScheduleTimeMillis}")
            WidgetsLogger.i(LOG_TAG, "  constraints=${info.progress}, runAttemptCount=${info.runAttemptCount}")
        }
    }
}