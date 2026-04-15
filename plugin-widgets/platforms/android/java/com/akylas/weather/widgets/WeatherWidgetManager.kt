package com.akylas.weather.widgets

import android.content.Context
import android.content.Intent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import androidx.glance.ImageProvider
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import androidx.core.content.edit
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.launch

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.*

/**
 * Reactive data store for widget data using StateFlow
 */
object WidgetDataStore {
    private const val LOG_TAG = "JS"

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val _widgetData = MutableStateFlow<Map<Int, WeatherWidgetData>>(emptyMap())
    val widgetData: StateFlow<Map<Int, WeatherWidgetData>> = _widgetData.asStateFlow()

    // Version map used to force emission for a specific widgetId without changing the data
    private val _widgetVersions = MutableStateFlow<Map<Int, Long>>(emptyMap())
    val widgetVersions: StateFlow<Map<Int, Long>> = _widgetVersions.asStateFlow()


    fun getIds(): Array<Int> {
        return _widgetData.value.keys.toTypedArray()
    }

    fun updateWidgetData(widgetId: Int, data: WeatherWidgetData) {
        _widgetData.update { current ->
            current + (widgetId to data)
        }
        // bump version so flows observing this widget always emit after an update
        _widgetVersions.update { current ->
            current + (widgetId to (current[widgetId]?.plus(1) ?: System.currentTimeMillis()))
        }
        WidgetsLogger.d(LOG_TAG, "Updated data for widgetId=$widgetId, total widgets=${_widgetData.value.size}")
    }

    fun removeWidgetData(widgetId: Int) {
        _widgetData.update { current ->
            current - widgetId
        }
        _widgetVersions.update { current ->
            val m = current.toMutableMap()
            m.remove(widgetId)
            m
        }
        WidgetsLogger.d(LOG_TAG, "Removed data for widgetId=$widgetId")
    }

    fun initializeFromCache(cache: Map<Int, WeatherWidgetData>) {
        _widgetData.value = cache
        // initialize versions so existing widgets have stable versions
        val versions = cache.keys.associateWith { System.currentTimeMillis() }
        _widgetVersions.value = versions
        WidgetsLogger.d(LOG_TAG, "Initialized with ${cache.size} cached widgets")
    }

    /**
     * Returns a StateFlow that emits a Pair(dataForId, version) so callers can react to
     * version bumps even if the data payload is structurally identical.
     */
    fun getWidgetDataFlow(widgetId: Int): StateFlow<Pair<WeatherWidgetData?, Long>> {
        WidgetsLogger.d(LOG_TAG, "getWidgetDataFlow widgetId=$widgetId")

        return _widgetData
            .combine(_widgetVersions) { dataMap, versions ->
                Pair(dataMap[widgetId], versions[widgetId] ?: 0L)
            }
            // Use shared long-lived scope so the flow stays active and consistent across callers
            .stateIn(
                scope = scope,
                started = SharingStarted.Eagerly,
                initialValue = Pair(_widgetData.value[widgetId], _widgetVersions.value[widgetId] ?: 0L)
            )
    }

    /**
     * Force a flow emission for the given widgetId without changing the stored WeatherWidgetData.
     * Useful to trigger Glance recomposition or UI refresh when external state changed (theme, locale, etc).
     */
    fun touchWidget(widgetId: Int) {
        _widgetVersions.update { current ->
            current + (widgetId to (current[widgetId]?.plus(1) ?: System.currentTimeMillis()))
        }
        WidgetsLogger.d(LOG_TAG, "touchWidget bumped version for widgetId=$widgetId")
    }
}

/**
 * Reactive config store for widget configurations using StateFlow
 * Enables automatic widget recomposition when settings change
 */
object WidgetConfigStore {
    private const val LOG_TAG = "JS"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val _widgetConfigs = MutableStateFlow<Map<Int, WidgetConfig>>(emptyMap())
    val widgetConfigs: StateFlow<Map<Int, WidgetConfig>> = _widgetConfigs.asStateFlow()

    // Cache per-widget settings flows so the same instance is reused across recompositions
    private val settingsFlowCache = mutableMapOf<Int, StateFlow<JsonObject?>>()

    // Track whether storage has been loaded at least once
    @Volatile
    private var storageLoaded = false

    fun updateWidgetConfig(widgetId: Int, config: WidgetConfig) {
        _widgetConfigs.update { current ->
            current + (widgetId to config)
        }
        WidgetsLogger.d(LOG_TAG, "Updated config for widgetId=$widgetId, total widgets=${_widgetConfigs.value.size}, config=$config")
    }

    fun removeWidgetConfig(widgetId: Int) {
        _widgetConfigs.update { current ->
            current - widgetId
        }
        synchronized(settingsFlowCache) { settingsFlowCache.remove(widgetId) }
        WidgetsLogger.d(LOG_TAG, "Removed config for widgetId=$widgetId")
    }

    fun initializeFromStorage(configs: Map<Int, WidgetConfig>) {
        storageLoaded = true
        _widgetConfigs.value = configs
        // Invalidate all cached flows — they were built before storage loaded and may
        // have captured a null/empty initial value. They will be rebuilt on next access.
        synchronized(settingsFlowCache) { settingsFlowCache.clear() }
        WidgetsLogger.d(LOG_TAG, "Initialized with ${configs.size} widget configs, cleared settings flow cache")
    }

    fun getConfig(widgetId: Int): WidgetConfig? {
        return _widgetConfigs.value[widgetId]
    }

    fun getIds(): Array<Int> {
        return _widgetConfigs.value.keys.toTypedArray()
    }

    /**
     * Returns a stable, cached StateFlow for a widget's settings.
     * IMPORTANT: Call only AFTER getAllWidgetConfigs() has been called (storage loaded),
     * otherwise the initial value will be null even if a config exists in prefs.
     */
    fun getWidgetSettingsFlow(widgetId: Int): StateFlow<JsonObject?> {
        return synchronized(settingsFlowCache) {
            settingsFlowCache.getOrPut(widgetId) {
                WidgetsLogger.d(LOG_TAG, "Creating new settings flow for widgetId=$widgetId, storageLoaded=$storageLoaded, currentSettings=${_widgetConfigs.value[widgetId]?.settings}")
                widgetConfigs
                    .map { configs -> configs[widgetId]?.settings }
                    .distinctUntilChanged { old, new ->
                        // Compare by content (JSON string) not by reference
                        old?.toString() == new?.toString()
                    }
                    .stateIn(
                        scope = scope,
                        started = SharingStarted.Eagerly,
                        initialValue = _widgetConfigs.value[widgetId]?.settings
                    )
            }
        }
    }
}

/**
 * Manages weather widget updates and scheduling
 */
object WeatherWidgetManager {
    private val coroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private const val WIDGET_PREFS_FILE = "prefs.db"
    private const val UPDATE_FREQUENCY_KEY = "widget_update_frequency"
    private const val UPDATE_APP_ON_WIDGET_TAP_KEY = "widget_open_app_on_tap"
    private const val WIDGET_CONFIGS_KEY = "widget_configs" // per-instance configs
    private const val WIDGET_KIND_CONFIGS_KEY = "widget_kind_configs" // per-kind default configs
    private const val ACTIVE_WIDGETS_KEY = "active_widget_ids"
    private const val WIDGET_DATA_CACHE_KEY = "widget_data_cache"
    private const val DEFAULT_UPDATE_FREQUENCY = 30L

    private const val LOG_TAG = "JS"

    private val JSON = Json { ignoreUnknownKeys = true; isLenient = true }

    // Widget data cache - for persistence only
    private val widgetDataCache = mutableMapOf<Int, WeatherWidgetData>()
    private var cacheLoaded = false

    /**
     * Load widget data cache from SharedPreferences and initialize StateFlow
     * Made internal so widgets can ensure cache is loaded before observing StateFlow
     */
    internal fun loadWidgetDataCache(context: Context) {
        if (cacheLoaded) return
        
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val json = prefs.getString(WIDGET_DATA_CACHE_KEY, null)
        
        if (json.isNullOrEmpty()) {
            WidgetsLogger.d(LOG_TAG, "No persisted widget data cache found")
            cacheLoaded = true
            return
        }
        
        try {
            val jsonObject = JSONObject(json)
            val keys = jsonObject.keys()
            
            while (keys.hasNext()) {
                val widgetId = keys.next().toInt()
                val dataJson = jsonObject.getString(widgetId.toString())
                val data = JSON.decodeFromString<WeatherWidgetData>(dataJson)
                widgetDataCache[widgetId] = data
            }
            
            // Initialize StateFlow with cached data
            WidgetDataStore.initializeFromCache(widgetDataCache.toMap())
            
            WidgetsLogger.i(LOG_TAG, "Loaded ${widgetDataCache.size} widgets from persisted cache")
        } catch (e: Exception) {
            WidgetsLogger.e(LOG_TAG, "Failed to load widget data cache", e)
        }
        
        cacheLoaded = true
    }

    /**
     * Save widget data cache to SharedPreferences
     */
    private fun saveWidgetDataCache(context: Context) {
        try {
            val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
            val jsonObject = JSONObject()
            
            widgetDataCache.forEach { (widgetId, data) ->
                val dataJson = Json.encodeToString(WeatherWidgetData.serializer(), data)
                jsonObject.put(widgetId.toString(), dataJson)
            }
            
            prefs.edit { putString(WIDGET_DATA_CACHE_KEY, jsonObject.toString()) }
            WidgetsLogger.d(LOG_TAG, "Saved ${widgetDataCache.size} widgets to persisted cache")
        } catch (e: Exception) {
            WidgetsLogger.e(LOG_TAG, "Failed to save widget data cache", e)
        }
    }

    fun deleteWidgetCache(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "deleteWidgetCache(widgetId=$widgetId) called")
        // Remove from StateFlow
        WidgetDataStore.removeWidgetData(widgetId)

        // Delete cached data
        loadWidgetDataCache(context)
        widgetDataCache.remove(widgetId)
        saveWidgetDataCache(context)
        
    }


    /**
     * Get list of active widget IDs from persistent storage
     */
    private fun getActiveWidgetIdsFromPrefs(context: Context): MutableSet<Int> {
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val json = prefs.getString(ACTIVE_WIDGETS_KEY, null)
        
        if (json.isNullOrEmpty()) {
            return mutableSetOf()
        }
        
        return try {
            val array = JSONArray(json)
            val ids = mutableSetOf<Int>()
            for (i in 0 until array.length()) {
                ids.add(array.getInt(i))
            }
            WidgetsLogger.d(LOG_TAG, "Loaded ${ids.size} active widget IDs from prefs")
            ids
        } catch (e: Exception) {
            WidgetsLogger.e(LOG_TAG, "Failed to parse active widget IDs", e)
            mutableSetOf()
        }
    }

    /**
     * Save list of active widget IDs to persistent storage
     */
    private fun saveActiveWidgetIdsToPrefs(context: Context, widgetIds: Set<Int>) {
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val array = JSONArray(widgetIds.toList())
        prefs.edit { putString(ACTIVE_WIDGETS_KEY, array.toString()) }
        WidgetsLogger.d(LOG_TAG, "Saved ${widgetIds.size} active widget IDs to prefs")
    }

    /**
     * Add widget ID to active list
     */
    @JvmStatic
    fun addActiveWidget(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "addActiveWidget(widgetId=$widgetId)")
        val activeIds = getActiveWidgetIdsFromPrefs(context)
        if (activeIds.add(widgetId)) {
            saveActiveWidgetIdsToPrefs(context, activeIds)
            WidgetsLogger.i(LOG_TAG, "Added widgetId=$widgetId to active list (total=${activeIds.size})")
        } else {
            WidgetsLogger.d(LOG_TAG, "Widget $widgetId already in active list")
        }
    }

    /**
     * Remove widget ID from active list
     */
    @JvmStatic
    fun removeActiveWidget(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "removeActiveWidget(widgetId=$widgetId)")
        val activeIds = getActiveWidgetIdsFromPrefs(context)
        if (activeIds.remove(widgetId)) {
            saveActiveWidgetIdsToPrefs(context, activeIds)
            WidgetsLogger.i(LOG_TAG, "Removed widgetId=$widgetId from active list (remaining=${activeIds.size})")
        } else {
            WidgetsLogger.d(LOG_TAG, "Widget $widgetId not in active list")
        }
    }

    /**
     * Check if a widget is in the active list
     */
    @JvmStatic
    fun isWidgetAddedToLauncher(context: Context, widgetId: Int): Boolean {
        val activeIds = getActiveWidgetIdsFromPrefs(context)
        val isActive = activeIds.contains(widgetId)
        WidgetsLogger.d(LOG_TAG, "isWidgetAddedToLauncher(widgetId=$widgetId) -> $isActive")
        return isActive
    }

    /**
     * Get all active widget IDs from persistent list
     */
    @JvmStatic
    fun getAllActiveWidgetIds(context: Context): List<Int> {
        val activeIds = getActiveWidgetIdsFromPrefs(context)
        WidgetsLogger.d(LOG_TAG, "getAllActiveWidgetIds() -> ${activeIds.size} widgets")
        return activeIds.toList()
    }

    /**
     * Request update for all active widgets
     */
    @JvmStatic
    fun requestAllWidgetsUpdate(context: Context, updateData: Boolean = true) {
        WidgetsLogger.d(LOG_TAG, "requestAllWidgetsUpdate() called")
        val activeIds = getActiveWidgetIdsFromPrefs(context)
        
        if (activeIds.isEmpty()) {
            WidgetsLogger.i(LOG_TAG, "No active widgets to update")
            return
        }

        WidgetsLogger.d(LOG_TAG, "Requesting update for ${activeIds.size} active widgets")
        var successCount = 0
        
        activeIds.forEach { widgetId ->
            try {
                WidgetsLogger.d(LOG_TAG, "Requesting update for widgetId=$widgetId")
                if (updateData) {
                    requestWidgetUpdate(context, widgetId, updateData)
                } else {
                    WidgetDataStore.touchWidget(widgetId)
                }
                successCount++
            } catch (e: Exception) {
                WidgetsLogger.e(LOG_TAG, "Failed to request update for widgetId=$widgetId", e)
            }
        }
        
        WidgetsLogger.i(LOG_TAG, "Completed requestAllWidgetsUpdate: requested=$successCount of ${activeIds.size}")
    }

    /**
     * Re-render all widgets without fetching new data (e.g., for theme changes)
     */
    @JvmStatic
    fun reRenderAllWidgets(context: Context) {

        // 
        // requestAllWidgetsUpdate(context, false)
        WidgetsLogger.d(LOG_TAG, "reRenderAllWidgets() called")
        coroutineScope.launch {
            SimpleWeatherWithClockWidget().apply { updateAll(context) }
            SimpleWeatherWithDateWidget().apply { updateAll(context) }
            SimpleWeatherWidget().apply { updateAll(context) }
            DailyWeatherWidget().apply { updateAll(context) }
            HourlyWeatherWidget().apply { updateAll(context) }
            ForecastWeatherWidget().apply { updateAll(context) }
        }
    }
    /**
     * Re-render all widgets without fetching new data (e.g., for theme changes)
     */
    @JvmStatic
    fun reRenderWidget(context: Context, widgetId: Int) {
        forceGlanceUpdate(context, widgetId)
    }


    /**
     * Update only clock widgets (for time changes)
     */
    // @JvmStatic
    // fun updateClockWidgets(context: Context) {
    //     WidgetsLogger.d(LOG_TAG, "updateClockWidgets() called")

    //     val appWidgetManager = AppWidgetManager.getInstance(context)
    //     val clockWidgetIds = appWidgetManager.getAppWidgetIds(
    //         ComponentName(context, SimpleWeatherWithClockWidgetReceiver::class.java)
    //     )

    //     if (clockWidgetIds.isNotEmpty()) {
    //         val intent = Intent(context, SimpleWeatherWithClockWidgetReceiver::class.java).apply {
    //             action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
    //             putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, clockWidgetIds)
    //         }
    //         context.sendBroadcast(intent)
    //         WidgetsLogger.d(LOG_TAG, "Updated ${clockWidgetIds.size} clock widgets")
    //     }
    // }

    /**
     * Update only date widgets (for date changes)
     */
    // @JvmStatic
    // fun updateDateWidgets(context: Context) {
    //     WidgetsLogger.d(LOG_TAG, "updateDateWidgets() called")

    //     val appWidgetManager = AppWidgetManager.getInstance(context)
    //     val dateWidgetIds = appWidgetManager.getAppWidgetIds(
    //         ComponentName(context, SimpleWeatherWithDateWidgetReceiver::class.java)
    //     )

    //     if (dateWidgetIds.isNotEmpty()) {
    //         val intent = Intent(context, SimpleWeatherWithDateWidgetReceiver::class.java).apply {
    //             action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
    //             putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, dateWidgetIds)
    //         }
    //         context.sendBroadcast(intent)
    //         WidgetsLogger.d(LOG_TAG, "Updated ${dateWidgetIds.size} date widgets")
    //     }
    // }

    /**
     * Schedule periodic widget updates - only schedules if widgets are active
     */
//    @SuppressLint("UseKtx")
//    @JvmStatic
//    fun scheduleWidgetUpdates(context: Context, frequencyMinutes: Long = getUpdateFrequency(context)) {
//        WidgetsLogger.d(LOG_TAG, "scheduleWidgetUpdates(frequencyMinutes=$frequencyMinutes)")
//
//        // Check if any widgets are active
//        val activeWidgets = getAllActiveWidgetIds(context)
//        if (activeWidgets.isEmpty()) {
//            WidgetsLogger.i(LOG_TAG, "No active widgets found, cancelling scheduled updates")
//            cancelWidgetUpdates(context)
//            return
//        }
//
//        // Save frequency preference
//        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
//        prefs.edit { putLong(UPDATE_FREQUENCY_KEY, frequencyMinutes) }
//        WidgetsLogger.i(LOG_TAG, "Saved update frequency: $frequencyMinutes minutes")
//
//        // Build constraints
//        val constraints = Constraints.Builder()
//            .setRequiredNetworkType(NetworkType.CONNECTED)
//            .setRequiresBatteryNotLow(true) // Don't run when battery is low
//            .build()
//
//        // Create periodic work request
//        val updateRequest = PeriodicWorkRequestBuilder<WeatherWidgetUpdateWorker>(
//            frequencyMinutes,
//            TimeUnit.MINUTES
//        )
//            .setConstraints(constraints)
//            .setInitialDelay(0, TimeUnit.MINUTES)
//            .addTag(WIDGET_UPDATE_WORK_TAG)
//            .build()
//
//        WidgetsLogger.d(LOG_TAG, "Enqueueing WorkManager job with tag $WIDGET_UPDATE_WORK_TAG for ${activeWidgets.size} widgets")
//        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
//            WIDGET_UPDATE_WORK_TAG,
//            ExistingPeriodicWorkPolicy.REPLACE,
//            updateRequest
//        )
//        WidgetsLogger.i(LOG_TAG, "Scheduled periodic widget updates every $frequencyMinutes minutes with battery constraint")
//    }
//
//    /**
//     * Cancel scheduled widget updates
//     */
//    @JvmStatic
//    fun cancelWidgetUpdates(context: Context) {
//        WidgetsLogger.i(LOG_TAG, "cancelWidgetUpdates() called; cancelling work with tag $WIDGET_UPDATE_WORK_TAG")
//        WorkManager.getInstance(context).cancelAllWorkByTag(WIDGET_UPDATE_WORK_TAG)
//    }

    /**
     * Get current update frequency from preferences
     */
    @JvmStatic
    fun getUpdateFrequency(context: Context): Long {
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val freq = prefs.getLong(UPDATE_FREQUENCY_KEY, DEFAULT_UPDATE_FREQUENCY)
        WidgetsLogger.d(LOG_TAG, "getUpdateFrequency() -> $freq")
        return freq
    }

    @JvmStatic
    fun getOpenAppOnTap(context: Context): Boolean {
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val value = prefs.getBoolean(UPDATE_APP_ON_WIDGET_TAP_KEY, false)
        return value
    }

    /**
     * Set update frequency and reschedule if widgets are active
     */
    @JvmStatic
    fun setOpenAppOnTap(context: Context, value: Boolean) {
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        prefs.edit { putBoolean(UPDATE_APP_ON_WIDGET_TAP_KEY, value) }
        
        // Reschedule with new frequency if widgets are active
        requestAllWidgetsUpdate(context)
    }


    /**
     * Set update frequency and reschedule if widgets are active
     */
    @JvmStatic
    fun setUpdateFrequency(context: Context, frequencyMinutes: Long) {
        WidgetsLogger.d(LOG_TAG, "setUpdateFrequency(frequencyMinutes=$frequencyMinutes)")
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        prefs.edit { putLong(UPDATE_FREQUENCY_KEY, frequencyMinutes) }
        
        // Reschedule with new frequency if widgets are active
        requestAllWidgetsUpdate(context)
    }


    @JvmStatic
    fun checkActiveWidgets(context: Context) {
        // for some reason sometimes when a widget is removed it seems onWidgetRemoved is not called
        // so we end up with orphan data. So for now we clean it on start
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val activeIdsToCheck = getActiveWidgetIdsFromPrefs(context)
        loadWidgetDataCache(context)
        activeIdsToCheck.addAll(getAllWidgetConfigs(context).keys.toTypedArray())
        activeIdsToCheck.addAll(WidgetDataStore.getIds())
        if (activeIdsToCheck.isEmpty()) return
            WidgetsLogger.i(LOG_TAG, "checkActiveWidgets activeIdsToCheck: ${activeIdsToCheck}")

        val receiverToWidgetMap = mapOf(
            SimpleWeatherWidgetReceiver::class.java to SimpleWeatherWidget::class.java,
            SimpleWeatherWithDateWidgetReceiver::class.java to SimpleWeatherWithDateWidget::class.java,
            SimpleWeatherWithClockWidgetReceiver::class.java to SimpleWeatherWithClockWidget::class.java,
            HourlyWeatherWidgetReceiver::class.java to HourlyWeatherWidget::class.java,
            DailyWeatherWidgetReceiver::class.java to DailyWeatherWidget::class.java,
            ForecastWeatherWidgetReceiver::class.java to ForecastWeatherWidget::class.java
        )

        for ((receiverClass, widgetClass) in receiverToWidgetMap) {
            val allIds = appWidgetManager.getAppWidgetIds(ComponentName(context, receiverClass))
            WidgetsLogger.i(LOG_TAG, "checkActiveWidgets existing widgets for class $receiverClass: ${allIds.contentToString()}")
            allIds.forEach { widgetId ->
                if (widgetId in activeIdsToCheck) {
                    // widget still exists
                    activeIdsToCheck.remove(widgetId)
                }
            }

        }

        // ids still in activeIds are removed widgets
        if (activeIdsToCheck.isNotEmpty()) {
            WidgetsLogger.i(LOG_TAG, "checkActiveWidgets removing old widgets: $activeIdsToCheck")
            val activeIds = getActiveWidgetIdsFromPrefs(context)
            activeIds.removeAll(activeIdsToCheck)
            saveActiveWidgetIdsToPrefs(context, activeIds)
            val configs = getAllWidgetConfigs(context).toMutableMap()
            loadWidgetDataCache(context)
            activeIdsToCheck.forEach { widgetId ->
                widgetDataCache.remove(widgetId)
                configs.remove(widgetId)
                WidgetDataStore.removeWidgetData(widgetId)
                WidgetConfigStore.removeWidgetConfig(widgetId)
            }
            saveWidgetDataCache(context)
            saveAllWidgetConfigs(context, configs)

        }
    }

    /**
     * Called when a widget is added - ensure updates are scheduled
     */
    @JvmStatic
    fun onWidgetAdded(context: Context, widgetId: Int) {
        WidgetsLogger.i(LOG_TAG, "onWidgetAdded(widgetId=$widgetId)")
        
        // ensure config exists
        loadWidgetConfig(context, widgetId, true)
        // Add to active list
        addActiveWidget(context, widgetId)
        sendWidgetAdded(context, widgetId)
    }


    /**
     * Called when a widget is removed - cancel updates if no more widgets
     */
    fun onWidgetRemoved(context: Context, widgetId: Int) {
        WidgetsLogger.i(LOG_TAG, "onWidgetRemoved(widgetId=$widgetId)")
        
        // Remove from active list
        removeActiveWidget(context, widgetId)
        
        // Delete widget config and data
        deleteWidgetConfig(context, widgetId)
        deleteWidgetCache(context, widgetId)

        // test
        val configs = getAllWidgetConfigs(context).toMutableMap()

        sendWidgetRemoved(context, widgetId)
    }

    /**
     * Request immediate update for a specific widget
     */

     @JvmStatic
    fun requestWidgetUpdate(context: Context, widgetId: Int) {
        requestWidgetUpdate(context, widgetId, true)
    }
    @JvmStatic
    fun requestWidgetUpdate(context: Context, widgetId: Int, updateData: Boolean = true) {
        // ensure config exists
        loadWidgetConfig(context, widgetId, false) ?: return
        WidgetsLogger.d(LOG_TAG, "requestWidgetUpdate(widgetId=$widgetId, updateData=$updateData)")
        // Send broadcast to JS side to request weather data
        val intent = Intent("com.akylas.weather.WIDGET_UPDATE_REQUEST")
        intent.putExtra("widgetId", widgetId)
        intent.putExtra("updateData", updateData)
        intent.setPackage(context.packageName)
        context.sendBroadcast(intent)
        WidgetsLogger.i(LOG_TAG, "Sent WIDGET_UPDATE_REQUEST for widgetId=$widgetId")
        
    }
    /**
     * Request immediate update for a specific widget
     */
    @JvmStatic
    fun sendWidgetAdded(context: Context, widgetId: Int) {
        // ensure config exists
        loadWidgetConfig(context, widgetId, false) ?: return
        WidgetsLogger.d(LOG_TAG, "sendWidgetAdded(widgetId=$widgetId)")
        // Send broadcast to JS side to request weather data
        val intent = Intent("com.akylas.weather.WIDGET_ADDED")
        intent.putExtra("widgetId", widgetId)
        intent.setPackage(context.packageName)
        context.sendBroadcast(intent)
        WidgetsLogger.i(LOG_TAG, "Sent WIDGET_ADDED for widgetId=$widgetId")
    }
    /**
     * Request immediate update for a specific widget
     */
    @JvmStatic
    fun sendWidgetRemoved(context: Context, widgetId: Int) {
        // ensure config exists
        // loadWidgetConfig(context, widgetId, false) ?: return
        WidgetsLogger.d(LOG_TAG, "sendWidgetRemoved(widgetId=$widgetId)")
        // Send broadcast to JS side to update UI if needed
        val intent = Intent("com.akylas.weather.WIDGET_REMOVED")
        intent.putExtra("widgetId", widgetId)
        intent.setPackage(context.packageName)
        context.sendBroadcast(intent)
        WidgetsLogger.i(LOG_TAG, "Sent WIDGET_REMOVED for widgetId=$widgetId")
        
    }

    /**
     * Set widget to loading state
     */
    @JvmStatic
    fun setWidgetLoading(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "setWidgetLoading(widgetId=$widgetId)")
        
        val loadingData = WeatherWidgetData(
            loadingState = WidgetLoadingState.LOADING
        )
        
        // Update StateFlow - triggers automatic recomposition
        WidgetDataStore.updateWidgetData(widgetId, loadingData)
        
        // Also update cache for persistence
        widgetDataCache[widgetId] = loadingData
    }
    
    /**
     * Set widget to error state
     */
    @JvmStatic
    fun setWidgetError(context: Context, widgetId: Int, errorMessage: String) {
        WidgetsLogger.d(LOG_TAG, "setWidgetError(widgetId=$widgetId, error=$errorMessage)")
        
        val errorData = WeatherWidgetData(
            loadingState = WidgetLoadingState.ERROR,
            errorMessage = errorMessage
        )
        
        // Update StateFlow - triggers automatic recomposition
        WidgetDataStore.updateWidgetData(widgetId, errorData)
        
        // Also update cache for persistence
        widgetDataCache[widgetId] = errorData
    }

    /**
    * Get the Glance widget class for a widget ID
    * NOTE: This is no longer used for forcing updates with StateFlow pattern,
    * but kept for potential future diagnostics
    */
    private fun getGlanceWidgetClass(context: Context, widgetId: Int): Class<out GlanceAppWidget>? {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        val receiverToWidgetMap = mapOf(
            SimpleWeatherWidgetReceiver::class.java to SimpleWeatherWidget::class.java,
            SimpleWeatherWithDateWidgetReceiver::class.java to SimpleWeatherWithDateWidget::class.java,
            SimpleWeatherWithClockWidgetReceiver::class.java to SimpleWeatherWithClockWidget::class.java,
            HourlyWeatherWidgetReceiver::class.java to HourlyWeatherWidget::class.java,
            DailyWeatherWidgetReceiver::class.java to DailyWeatherWidget::class.java,
            ForecastWeatherWidgetReceiver::class.java to ForecastWeatherWidget::class.java
        )
        
        for ((receiverClass, widgetClass) in receiverToWidgetMap) {
            val allIds = appWidgetManager.getAppWidgetIds(ComponentName(context, receiverClass))
            if (widgetId in allIds) {
                return widgetClass
            }
        }
        
        return null
    }

    /**
    * DEPRECATED: Force a Glance widget to update
    * 
    * This method is no longer used. With the StateFlow-based reactive architecture,
    * widgets automatically recompose when data changes via collectAsState.
    * Keeping this commented out for reference during transition period.
    */
    private fun forceGlanceUpdate(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "forceGlanceUpdate for widget $widgetId=")
        coroutineScope.launch {
            try {
                val widgetClass = getGlanceWidgetClass(context, widgetId)
                
                if (widgetClass != null) {
                    val widget = widgetClass.getDeclaredConstructor().newInstance()
                    
                    val glanceManager = GlanceAppWidgetManager(context)
                    val glanceIds = glanceManager.getGlanceIds(widgetClass)
                    
                    // Find matching GlanceId
                    val matchingGlanceId = glanceIds.find { glanceManager.getAppWidgetId(it) == widgetId }
                    WidgetsLogger.d(LOG_TAG, "Updating widget $widgetId of class=${widgetClass}")
                    
                    if (matchingGlanceId != null) {
                        widget.update(context, matchingGlanceId)
                        WidgetsLogger.d(LOG_TAG, "Updated Glance widget ${widgetId}")
                    } else {
                        // Update all widgets of this type
                        widget.updateAll(context)
                        WidgetsLogger.d(LOG_TAG, "Updated all widgets of type ${widgetClass.simpleName}")
                    }
                    // sendWidgetUpdate(context, widgetId, widgetClass)
                } else {
                    WidgetsLogger.w(LOG_TAG, "Could not find widget class for ${widgetId}")
                }
            } catch (e: Exception) {
                WidgetsLogger.e(LOG_TAG, "Error updating Glance widget ${widgetId}", e)
            }
        }
    }
    /**
     * Update widget with weather data received from JS
     *
     * NEW: Accepts WeatherWidgetData? - null indicates we should clear the widget data/cache for a widget.
     */
    @JvmStatic
    fun updateWidgetData(context: Context, widgetId: Int, data: WeatherWidgetData?) {
        if (data == null) {
            WidgetsLogger.i(LOG_TAG, "updateWidgetData(widgetId=$widgetId) received null data -> clearing cache")
            widgetDataCache.remove(widgetId)
            WidgetDataStore.removeWidgetData(widgetId)

            WidgetsLogger.i(LOG_TAG, "Cleared widget data for widgetId=$widgetId")
            return
        }

        WidgetsLogger.d(LOG_TAG, "updateWidgetData(widgetId=$widgetId) (object)")
        handleParsedWidgetData(context, widgetId, data)
    }

    /**
     * New: Updates widget by parsing JSON string into a WeatherWidgetData instance.
     * Accepts nullable JSON; null means clear data for this widget.
     */
    @JvmStatic
    fun updateWidgetData(context: Context, widgetId: Int, dataJson: String?) {
        if (dataJson == null || dataJson.isBlank()) {
            WidgetsLogger.w(LOG_TAG, "Received null data for widget $widgetId")
            setWidgetError(context, widgetId, "No data received")
            return
        }

        if (dataJson.isBlank()) {
            WidgetsLogger.w(LOG_TAG, "updateWidgetData(widgetId=$widgetId) received blank json; ignoring")
            return
        }

        try {
            val data = parseWeatherWidgetDataFromJson(dataJson)
            if (data == null) {
                WidgetsLogger.e(LOG_TAG, "Failed to parse widget data for widget $widgetId")
                setWidgetError(context, widgetId, "Invalid data format")
                return
            }
            
            // Mark as loaded
            val loadedData = data.copy(loadingState = WidgetLoadingState.LOADED)

            handleParsedWidgetData(context, widgetId, loadedData)
        } catch (e: Exception) {
            WidgetsLogger.e(LOG_TAG, "Error updating widget $widgetId", e)
            setWidgetError(context, widgetId, e.message ?: "Unknown error")
        }
    }

    /**
     * Get cached widget data - now reads from StateFlow
     */
    fun getWidgetData(context: Context, widgetId: Int): WeatherWidgetData? {
        loadWidgetDataCache(context)
        // Read from StateFlow for most up-to-date data
        val data = WidgetDataStore.widgetData.value[widgetId]
        WidgetsLogger.d(LOG_TAG, "getWidgetData(widgetId=$widgetId) -> found=${data != null}")
        return data
    }

    /**
     * Common handler used by both JSON and object update paths
     * Now uses StateFlow for reactive updates instead of manual widget.update()
     */
    private fun handleParsedWidgetData(context: Context, widgetId: Int, data: WeatherWidgetData) {
        WidgetsLogger.d(LOG_TAG, "handleParsedWidgetData(widgetId=$widgetId, temperature=${data.temperature}, location=${data.locationName}, loadingState=${data.loadingState})")
        
        loadWidgetDataCache(context)
        widgetDataCache[widgetId] = data
        saveWidgetDataCache(context) // Persist after update
        
        // Update StateFlow - triggers automatic recomposition in all observing widgets
        WidgetDataStore.updateWidgetData(widgetId, data)
        
        WidgetsLogger.i(LOG_TAG, "Widget data updated for widgetId=$widgetId (reactive)")
    }

    /**
     * Explicit method to clear widget data
     */
    @JvmStatic
    fun clearWidgetData(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "clearWidgetData(widgetId=$widgetId) called")
        
        deleteWidgetCache(context, widgetId) // Persist after removal
        
        updateWidget(context, widgetId)
        WidgetsLogger.i(LOG_TAG, "Cleared widget data for widgetId=$widgetId")
    }

    /**
     * Parse JSON produced by JS bridge into a WeatherWidgetData instance.
     */
    private fun parseWeatherWidgetDataFromJson(dataJson: String): WeatherWidgetData? {
        WidgetsLogger.d(LOG_TAG, "parseWeatherWidgetDataFromJson(length=${dataJson.length})")
        return try {
            val parsed = JSON.decodeFromString<WeatherWidgetData>(dataJson)
            WidgetsLogger.d(LOG_TAG, "parseWeatherWidgetDataFromJson succeeded for widget. temperature=${parsed.temperature} location=${parsed.locationName} state=${parsed.loadingState} errorMessage=${parsed.errorMessage}")
            parsed
        } catch (t: Throwable) {
            WidgetsLogger.e(LOG_TAG, "parseWeatherWidgetDataFromJson failed", t)
            null
        }
    }

     /**
      * Decodes a file path into a Bitmap or returns null if that's not possible.
      * First tries to decode from an absolute filesystem path; if the file does not exist
      * and a Context is provided, falls back to loading from the app's merged assets
      * (useful for Glance Compose previews and asset-relative paths).
      */
    fun getIconBitmapFromPath(iconFilePath: String?, context: Context? = null): Bitmap? {
        if (iconFilePath.isNullOrBlank()) {
            WidgetsLogger.d(LOG_TAG, "Icon file path is null or blank")
            return null
        }
       val drawable = com.nativescript.image.DrawableUtils.tryLoadExternalDrawable(context, android.net.Uri.parse(iconFilePath))
       if (drawable is BitmapDrawable) {
           return drawable.getBitmap()
       }
        // Try absolute path first (works at runtime with NativeScript)
        val file = File(iconFilePath)
        if (file.exists()) {
            return try {
                BitmapFactory.decodeFile(iconFilePath)
            } catch (t: Throwable) {
                WidgetsLogger.e(LOG_TAG, "Error decoding icon bitmap from $iconFilePath", t)
                null
            }
        }
        // Fall back to loading from assets (works in Glance preview and with relative paths)
        if (context != null) {
            return try {
                context.assets.open(iconFilePath).use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            } catch (t: Throwable) {
                WidgetsLogger.d(LOG_TAG, "Icon not found in assets: $iconFilePath")
                null
            }
        }
        return null
    }

    /**
     * Creates an ImageProvider wrapping the decoded Bitmap or returns null.
     * Use this inside widgets where the ImageProvider may be absent.
     * Pass a Context to enable fallback loading from the app's assets (required for previews).
     */
    fun getIconImageProviderFromPath(iconFilePath: String?, context: Context? = null): ImageProvider? {
        return getIconBitmapFromPath(iconFilePath, context)?.let { ImageProvider(it) }
    }

    /**
     * Build an intent that will open the main app (launcher activity).
     * Returns null only if the package manager is not available for some reason.
     */
    fun createAppLaunchIntent(context: Context): Intent? {
        return try {
            val pm = context.packageManager
            var intent = pm.getLaunchIntentForPackage(context.packageName)
            if (intent == null) {
                intent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                    setPackage(context.packageName)
                }
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            WidgetsLogger.d(LOG_TAG, "createAppLaunchIntent: created intent for package ${context.packageName}")
            intent
        } catch (t: Throwable) {
            WidgetsLogger.e(LOG_TAG, "createAppLaunchIntent failed", t)
            null
        }
    }

    /**
     * Update specific widget
     */
    private fun updateWidget(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "updateWidget(widgetId=$widgetId) scanning receivers")
        val widgetClass = getGlanceWidgetClass(context, widgetId)
        if (widgetClass != null) {
            sendWidgetUpdate(context, widgetId, widgetClass)
        }
    }

    /**
     * Update specific widget
     */
    private fun sendWidgetUpdate(context: Context, widgetId: Int, receiverClass: Class<out GlanceAppWidget>) {
        WidgetsLogger.d(LOG_TAG, "sendWidgetUpdate matched receiver ${receiverClass.simpleName} for widgetId=$widgetId")
        val intent = Intent(context, receiverClass)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
        context.sendBroadcast(intent)
        WidgetsLogger.i(LOG_TAG, "Sent ACTION_APPWIDGET_UPDATE broadcast to ${receiverClass.simpleName} for widgetId=$widgetId")
    }

    /**
     * Get all per-kind default configurations
     */
    @JvmStatic
    fun getAllKindConfigs(context: Context): Map<String, WidgetConfig> {
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val json = prefs.getString(WIDGET_KIND_CONFIGS_KEY, null) ?: run {
            WidgetsLogger.d(LOG_TAG, "getAllKindConfigs() -> no stored configs")
            return emptyMap()
        }
            WidgetsLogger.i(LOG_TAG, "getAllKindConfigs ${json} ")

        return try {
            val configs = mutableMapOf<String, WidgetConfig>()
            val jsonObject = JSONObject(json)
            val keys = jsonObject.keys()

            while (keys.hasNext()) {
                val widgetKind = keys.next()
                val configJson = jsonObject.getJSONObject(widgetKind)
                configs[widgetKind] = parseWidgetConfig(configJson)
            }
            WidgetsLogger.i(LOG_TAG, "Loaded ${configs.size} widget kind configurations")
            configs
        } catch (e: Exception) {
            WidgetsLogger.e(LOG_TAG, "Failed to parse widget kind configurations", e)
            emptyMap()
        }
    }

    /**
     * Save all per-kind default configurations
     */
    @JvmStatic
    fun saveAllKindConfigs(context: Context, configs: Map<String, WidgetConfig>) {
        WidgetsLogger.d(LOG_TAG, "saveAllKindConfigs() saving ${configs.size} configs")
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val jsonObject = JSONObject()

        configs.forEach { (widgetKind, config) ->
            jsonObject.put(widgetKind, widgetConfigToJson(config))
        }

        prefs.edit { putString(WIDGET_KIND_CONFIGS_KEY, jsonObject.toString()) }
        WidgetsLogger.i(LOG_TAG, "All widget kind configurations saved")
    }

    /**
     * Get configuration for a specific widget kind (default settings)
     */
    @JvmStatic
    fun getKindConfig(context: Context, widgetKind: String): WidgetConfig {
        val configs = getAllKindConfigs(context)
        val config = configs[widgetKind]
        
        if (config == null) {
            WidgetsLogger.d(LOG_TAG, "No kind config for $widgetKind, creating with defaults from JSON")
            val defaultConfig = initializeKindConfigWithDefaults(context, widgetKind)
            saveKindConfig(context, widgetKind, defaultConfig)
            return defaultConfig
        }
        
        return config
    }

    /**
     * Save configuration for a specific widget kind
     */
    @JvmStatic
    fun saveKindConfig(context: Context, widgetKind: String, config: WidgetConfig) {
        WidgetsLogger.d(LOG_TAG, "saveKindConfig(widgetKind=$widgetKind)")
        val configs = getAllKindConfigs(context).toMutableMap()
        configs[widgetKind] = config
        saveAllKindConfigs(context, configs)
    }

    /**
     * Get all per-instance widget configurations
     */
    @JvmStatic
    fun getAllWidgetConfigs(context: Context): Map<Int, WidgetConfig> {
        // First check if configs are already in StateFlow
        val cachedConfigs = WidgetConfigStore.widgetConfigs.value
        if (cachedConfigs.isNotEmpty()) {
            WidgetsLogger.d(LOG_TAG, "getAllWidgetConfigs() -> returning ${cachedConfigs.size} from StateFlow")
            return cachedConfigs
        }
        
        // Load from SharedPreferences and initialize StateFlow
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val json = prefs.getString(WIDGET_CONFIGS_KEY, null) ?: run {
            WidgetsLogger.d(LOG_TAG, "getAllWidgetConfigs() -> no stored configs")
            return emptyMap()
        }

        return try {
            val configs = mutableMapOf<Int, WidgetConfig>()
            val jsonObject = JSONObject(json)
            val keys = jsonObject.keys()

            while (keys.hasNext()) {
                val widgetId = keys.next()
                val configJson = jsonObject.getJSONObject(widgetId)
                configs[widgetId.toInt()] = parseWidgetConfig(configJson)
                WidgetsLogger.i(LOG_TAG, "Loaded widget configuration ${widgetId.toInt()}:${configs[widgetId.toInt()]}")
            }
            WidgetsLogger.i(LOG_TAG, "Loaded ${configs.size} widget configurations")
            
            // Initialize StateFlow with loaded configs
            WidgetConfigStore.initializeFromStorage(configs)
            
            configs
        } catch (e: Exception) {
            WidgetsLogger.e(LOG_TAG, "Failed to parse widget configurations", e)
            emptyMap()
        }
    }

    /**
     * Save all per-instance widget configurations
     */
    @JvmStatic
    fun saveAllWidgetConfigs(context: Context, configs: Map<Int, WidgetConfig>) {
        WidgetsLogger.d(LOG_TAG, "saveAllWidgetConfigs() saving ${configs.size} configs")
        val prefs = context.getSharedPreferences(WIDGET_PREFS_FILE, Context.MODE_PRIVATE)
        val jsonObject = JSONObject()

        configs.forEach { (widgetId, config) ->
            jsonObject.put(widgetId.toString(), widgetConfigToJson(config))
        }

        prefs.edit { putString(WIDGET_CONFIGS_KEY, jsonObject.toString()) }
        WidgetsLogger.i(LOG_TAG, "All widget configurations saved: ${jsonObject.toString()}")
    }

    /**
     * Create widget instance configuration from kind defaults
     * Called when a new widget is added
     */
    @JvmStatic
    fun createInstanceConfig(context: Context, widgetId: Int, widgetKind: String): WidgetConfig {
        
        // Get kind defaults (with settings initialized from JSON)
        val kindConfig = getKindConfig(context, widgetKind)
        WidgetsLogger.d(LOG_TAG, "createInstanceConfig(widgetId=$widgetId, widgetKind=$widgetKind, kindConfig=$kindConfig)")
        
        // Create instance config with widgetKind set and copy settings
        val instanceConfig = WidgetConfig(
            locationName = kindConfig.locationName,
            latitude = kindConfig.latitude,
            longitude = kindConfig.longitude,
            model = kindConfig.model,
            provider = kindConfig.provider,
            widgetKind = widgetKind,
            settings = kindConfig.settings?.let { JsonObject(it) } // Create a copy of settings
        )
        
        // Save instance config
        saveWidgetConfig(context, widgetId, instanceConfig)
        
        WidgetsLogger.i(LOG_TAG, "Created instance config for widget $widgetId from kind $widgetKind (settings=${instanceConfig.settings}, instanceConfig=$instanceConfig)")
        return instanceConfig
    }

    /**
     * Load widget configuration for specific widget instance
     * If no instance config exists, creates one from kind defaults
     */
    @JvmStatic
    fun loadWidgetConfig(context: Context, widgetId: Int, canCreate: Boolean = true): WidgetConfig? {
        WidgetsLogger.d(LOG_TAG, "loadWidgetConfig(widgetId=$widgetId)")
        val config = getAllWidgetConfigs(context)[widgetId]
        
        if (config != null || !canCreate) {
            WidgetsLogger.d(LOG_TAG, "loadWidgetConfig(widgetId=$widgetId) -> found instance config:$config")
            return config
        }
        
        // No instance config - try to determine widget kind and create from defaults
        val widgetKind = getWidgetKindForId(context, widgetId)
        if (widgetKind != null) {
            WidgetsLogger.d(LOG_TAG, "loadWidgetConfig(widgetId=$widgetId) -> creating from kind $widgetKind")
            return createInstanceConfig(context, widgetId, widgetKind)
        }
        
        WidgetsLogger.w(LOG_TAG, "loadWidgetConfig(widgetId=$widgetId) -> no config found, returning default")
        return createDefaultConfig()
    }

    /**
     * Save widget configuration for specific widget instance
     */
    @JvmStatic
    fun saveWidgetConfig(context: Context, widgetId: Int, config: WidgetConfig) {
        WidgetsLogger.d(LOG_TAG, "saveWidgetConfig(widgetId=$widgetId, config=$config)")
        val configs = getAllWidgetConfigs(context).toMutableMap()
        configs[widgetId] = config
        saveAllWidgetConfigs(context, configs)
        
        // Update StateFlow to trigger reactive recomposition
        // Only update settings to avoid triggering data refetch
        WidgetConfigStore.updateWidgetConfig(widgetId, config)
        WidgetsLogger.i(LOG_TAG, "Updated WidgetConfigStore for widgetId=$widgetId - widgets will recompose automatically")
        forceGlanceUpdate(context, widgetId)
    }

    /**
     * New: Updates widget by parsing JSON string into a WeatherWidgetData instance.
     * Accepts nullable JSON; null means clear data for this widget.
     */
    @JvmStatic
    fun saveWidgetConfigString(context: Context, widgetId: Int, configJson: String) {
        WidgetsLogger.d(LOG_TAG, "saveWidgetConfigString(widgetId=$widgetId, configJson=$configJson)")
        if (configJson.isBlank()) {
            WidgetsLogger.w(LOG_TAG, "Received null config for widget $widgetId")
            return
        }
        try {
            val jsonObject = JSONObject(configJson)
            val config = parseWidgetConfig(jsonObject)

            saveWidgetConfig(context, widgetId, config)
        } catch (e: Exception) {
            WidgetsLogger.e(LOG_TAG, "Error updating widget $widgetId config" , e)
        }
    }

    /**
     * Delete widget configuration and data for specific instance
     */
    @JvmStatic
    fun deleteWidgetConfig(context: Context, widgetId: Int) {
        WidgetsLogger.d(LOG_TAG, "deleteWidgetConfig(widgetId=$widgetId)")
        
        WidgetConfigStore.removeWidgetConfig(widgetId)
    
        // Delete instance config
        val configs = WidgetConfigStore.widgetConfigs.value.toMutableMap()
        configs.remove(widgetId)
        saveAllWidgetConfigs(context, configs)
        
        // Remove from StateFlow
        // reloadConfigs()
 
        WidgetsLogger.i(LOG_TAG, "Deleted config and cache for widgetId=$widgetId")
    }

    /**
     * Get all widget IDs for a specific kind
     */
    @JvmStatic
    fun getInstancesOfKind(context: Context, widgetKind: String): List<Int> {
        val configs = getAllWidgetConfigs(context)
        val instances = configs.filter { it.value.widgetKind == widgetKind }.keys.toList()
        WidgetsLogger.d(LOG_TAG, "getInstancesOfKind($widgetKind) -> ${instances.size} instances")
        return instances
    }

    /**
     * Determine widget kind from widget ID by checking all receivers
     */
    private fun getWidgetKindForId(context: Context, widgetId: Int): String? {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        val receiverToKindMap = mapOf(
            SimpleWeatherWidgetReceiver::class.java to "SimpleWeatherWidget",
            SimpleWeatherWithDateWidgetReceiver::class.java to "SimpleWeatherWithDateWidget",
            SimpleWeatherWithClockWidgetReceiver::class.java to "SimpleWeatherWithClockWidget",
            HourlyWeatherWidgetReceiver::class.java to "HourlyWeatherWidget",
            DailyWeatherWidgetReceiver::class.java to "DailyWeatherWidget",
            ForecastWeatherWidgetReceiver::class.java to "ForecastWeatherWidget"
        )
        
        for ((receiverClass, widgetKind) in receiverToKindMap) {
            val allIds = appWidgetManager.getAppWidgetIds(ComponentName(context, receiverClass))
            if (widgetId in allIds) {
                WidgetsLogger.d(LOG_TAG, "Widget $widgetId is of kind $widgetKind")
                return widgetKind
            }
        }
        
        WidgetsLogger.w(LOG_TAG, "Could not determine widget kind for $widgetId")
        return null
    }

    fun JSONObject.toJsonObject(): JsonObject {
        val map = mutableMapOf<String, JsonElement>()

        keys().forEach { key ->
            map[key] = get(key).toJsonElement()
        }

        return JsonObject(map)
    }

    private fun Any?.toJsonElement(): JsonElement {
        return when (this) {
            null, JSONObject.NULL -> JsonNull

            is JSONObject -> this.toJsonObject()

            is JSONArray -> JsonArray((0 until length()).map { i ->
                get(i).toJsonElement()
            })

            is Boolean -> JsonPrimitive(this)
            is Int -> JsonPrimitive(this)
            is Long -> JsonPrimitive(this)
            is Double -> JsonPrimitive(this)

            is Number -> JsonPrimitive(this.toDouble()) // fallback

            else -> JsonPrimitive(this.toString())
        }
    }

    fun JsonObject.toJSONObject(): JSONObject {
        val jsonObject = JSONObject()

        for ((key, value) in this) {
            jsonObject.put(key, value.toJavaObject())
        }

        return jsonObject
    }

    private fun JsonElement.toJavaObject(): Any? {
        return when (this) {
            is JsonObject -> this.toJSONObject()
            is JsonArray -> {
                val jsonArray = JSONArray()
                this.forEach { element ->
                    jsonArray.put(element.toJavaObject())
                }
                jsonArray
            }
            is JsonPrimitive -> {
                when {
                    isString -> content
                    booleanOrNull != null -> boolean
                    longOrNull != null -> long
                    doubleOrNull != null -> double
                    else -> content
                }
            }
            JsonNull -> JSONObject.NULL
        }
    }

    // Helper: safely get a nullable string from JSONObject (handles explicit null and the literal "null")
    private fun JSONObject.optStringNullable(key: String): String? {
        if (!this.has(key)) return null
        val v = this.opt(key)
        return when (v) {
            null, JSONObject.NULL -> null
            is String -> if (v.equals("null", ignoreCase = true)) null else v
            else -> v.toString()
        }
    }
    /**
     * Parse WidgetConfig from JSONObject
     */
    private fun parseWidgetConfig(json: JSONObject): WidgetConfig {
        WidgetsLogger.i(LOG_TAG, "parseWidgetConfig $json")
        
        return WidgetConfig(
            locationName = json.optString("locationName", "current"),
            latitude = json.optDouble("latitude", 0.0),
            longitude = json.optDouble("longitude", 0.0),
            model = json.optStringNullable("model"),
            provider = json.optStringNullable("provider"),
            widgetKind = json.optStringNullable("widgetKind"),
            iconSet = json.optStringNullable("iconSet"),
            settings = json.optJSONObject("settings")?.toJsonObject()
        )
    }

    /**
     * Convert WidgetConfig to JSONObject
     */
    private fun widgetConfigToJson(config: WidgetConfig): JSONObject {
        val result = JSONObject().apply {
            put("locationName", config.locationName)
            put("latitude", config.latitude)
            put("longitude", config.longitude)
            config.model?.let { put("model", it) }
            config.provider?.let { put("provider", it) }
            config.iconSet?.let { put("iconSet", it) }
            config.widgetKind?.let { put("widgetKind", it) }
            put("settings", config.settings?.toJSONObject())
        }
        WidgetsLogger.d(LOG_TAG, "widgetConfigToJson $config result=$result")
        return result
    }

    /**
     * Create default config
     */
    @JvmStatic
    fun createDefaultConfig(): WidgetConfig {
        return WidgetConfig(
            locationName = "current",
            settings = null
        )
    }
    
    /**
     * Initialize kind config with default settings from generated configs
     * 
     * NOTE: Settings are now loaded from generated WidgetKindConfigs at build time,
     * not from runtime JSON parsing. This avoids code duplication and ensures
     * configs are available immediately at app start.
     */
    private fun initializeKindConfigWithDefaults(context: Context, widgetKind: String): WidgetConfig {
        return WidgetKindConfigs.createDefaultKindConfig(widgetKind)
    }
}

/**
 * Widget loading state
 */
@Serializable
enum class WidgetLoadingState {
    NONE,
    LOADING,
    LOADED,
    ERROR
}


/**
 * Widget configuration data class
 */
@Serializable
data class WidgetConfig(
    val locationName: String = "current",
    val latitude: Double? = 0.0,
    val longitude: Double? = 0.0,
    val model: String? = null,
    val provider: String? = null,
    val widgetKind: String? = null,
    val iconSet: String? = null,
    val settings: JsonObject? = null
)

/**
 * Weather widget data class
 */
@Serializable
data class WeatherWidgetData(
    val temperature: String = "",
    val iconPath: String = "",
    val description: String = "",
    val locationName: String = "",
    val date: String = "",
    val hourlyData: List<HourlyData> = emptyList(),
    val dailyData: List<DailyData> = emptyList(),
    val forecastData: List<ForecastData> = emptyList(),
    val lastUpdate: Long = System.currentTimeMillis(),
    val loadingState: WidgetLoadingState = WidgetLoadingState.NONE,
    val errorMessage: String = ""
)

@Serializable
data class HourlyData(
    val time: String = "",
    val temperature: String = "",
    val description: String = "",
    val iconPath: String = "",
    val precipitation: String = "",
    val windSpeed: String = "",
    val precipAccumulation: String = "",
)

@Serializable
data class DailyData(
    val day: String = "",
    val description: String = "",
    val temperatureHigh: String = "",
    val temperatureLow: String = "",
    val windSpeed: String = "",
    val iconPath: String = "",
    val precipitation: String = "",
    val precipAccumulation: String = "",
)

@Serializable
data class ForecastData(
    val dateTime: String = "",
    val dayName: String = "",
    val windSpeed: String = "",
    val temperature: String = "",
    val iconPath: String = "",
    val description: String = "",
    val precipitation: String = "",
    val precipAccumulation: String = "",
)