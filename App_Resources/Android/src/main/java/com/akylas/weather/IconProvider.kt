package com.akylas.weather

import android.animation.Animator
import android.animation.AnimatorInflater
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.XmlResourceParser
import android.graphics.drawable.Drawable
import android.util.Log
import androidx.core.content.res.ResourcesCompat
import org.xmlpull.v1.XmlPullParser
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json


/**
 * Slim, accurate port of Breezy Weather's icon-pack provider discovery & resolution.
 *
 * Public API:
 *  - listInstalledProviders(context)
 *  - getDrawable(context, providerRef, openMeteoCode, isDay, preferAnimated)
 *  - getDrawablePath(context, providerRef, openMeteoCode, isDay, preferAnimated)
 *  - getWeatherAnimators(context, providerRef, openMeteoCode, isDay)
 *
 * This follows Breezy Weather conventions:
 *  - discovers providers via intent actions defined in Constants
 *  - reads provider meta-data org.breezyweather.DRAWABLE_FILTER / ANIMATOR_FILTER
 *    (can be int resource id or xml resource name string)
 *  - uses filter XML mapping where tag=item name="..." value="..."
 *  - constructs base names like "weather_clear_day" and then applies filters
 *  - animated resources are expected in res/animator (not drawable)
 *
 * Adapt package name and usage to your app as needed.
 */

/* -------------------------
   Constants (copied from Breezy Weather)
   ------------------------- */

private object Constants {
    const val ACTION_ICON_PROVIDER = "org.breezyweather.ICON_PROVIDER"
    const val META_DATA_PROVIDER_CONFIG = "org.breezyweather.PROVIDER_CONFIG"
    const val META_DATA_DRAWABLE_FILTER = "org.breezyweather.DRAWABLE_FILTER"
    const val META_DATA_ANIMATOR_FILTER = "org.breezyweather.ANIMATOR_FILTER"
    const val META_DATA_SHORTCUT_FILTER = "org.breezyweather.SHORTCUT_FILTER"
    const val META_DATA_SUN_MOON_FILTER = "org.breezyweather.SUN_MOON_FILTER"

    const val GEOMETRIC_ACTION_ICON_PROVIDER = "com.wangdaye.geometricweather.ICON_PROVIDER"
    const val GEOMETRIC_META_DATA_PROVIDER_CONFIG = "com.wangdaye.geometricweather.PROVIDER_CONFIG"
    const val GEOMETRIC_META_DATA_DRAWABLE_FILTER = "com.wangdaye.geometricweather.DRAWABLE_FILTER"
    const val GEOMETRIC_META_DATA_ANIMATOR_FILTER = "com.wangdaye.geometricweather.ANIMATOR_FILTER"
    const val GEOMETRIC_META_DATA_SHORTCUT_FILTER = "com.wangdaye.geometricweather.SHORTCUT_FILTER"
    const val GEOMETRIC_META_DATA_SUN_MOON_FILTER = "com.wangdaye.geometricweather.SUN_MOON_FILTER"

    const val DAY = "day"
    const val NIGHT = "night"
    const val MINI = "mini"
    const val LIGHT = "light"
    const val GREY = "grey"
    const val DARK = "dark"
    const val XML = "xml"
    const val FOREGROUND = "foreground"
    const val SEPARATOR = "_"

    const val FILTER_TAG_ITEM = "item"
    const val FILTER_TAG_NAME = "name"
    const val FILTER_TAG_VALUE = "value"
    const val FILTER_TAG_CONFIG = "config"
    const val CONFIG_HAS_WEATHER_ICONS = "hasWeatherIcons"
    const val CONFIG_HAS_WEATHER_ANIMATORS = "hasWeatherAnimators"
    const val CONFIG_HAS_MINIMAL_ICONS = "hasMinimalIcons"
    const val CONFIG_HAS_SHORTCUT_ICONS = "hasShortcutIcons"
    const val CONFIG_HAS_SUN_MOON_DRAWABLES = "hasSunMoonDrawables"

    // resource name helpers (simplified map)
    fun getResourcesName(condition: WeatherCondition?): String = when (condition) {
        WeatherCondition.CLEAR -> "weather_clear"
        WeatherCondition.PARTLY_CLOUDY -> "weather_partly_cloudy"
        WeatherCondition.CLOUDY -> "weather_cloudy"
        WeatherCondition.RAIN -> "weather_rain"
        WeatherCondition.SNOW -> "weather_snow"
        WeatherCondition.WIND -> "weather_wind"
        WeatherCondition.FOG -> "weather_fog"
        WeatherCondition.SLEET -> "weather_sleet"
        WeatherCondition.HAZE -> "weather_haze"
        WeatherCondition.HAIL -> "weather_hail"
        WeatherCondition.THUNDER -> "weather_thunder"
        WeatherCondition.THUNDERSTORM -> "weather_thunderstorm"
        else -> "weather_clear"
    }

    fun getShortcutsName(condition: WeatherCondition?): String = "shortcuts_" + (condition?.name?.lowercase() ?: "unknown")
}

/* -------------------------
   Models
   ------------------------- */

enum class WeatherCondition {
    CLEAR, PARTLY_CLOUDY, CLOUDY, FOG, DRIZZLE, RAIN, FREEZING_RAIN,
    SNOW, SLEET, HAZE, THUNDER, THUNDERSTORM, HAIL, WIND, UNKNOWN
}

@Serializable
data class WeatherIconProviderInfo(
    val id: String,
    val name: String,
    val packageName: String?,
    val sampleIconPath: String?,
    val supportsAnimated: Boolean
)

/* -------------------------
   Open-Meteo mapper
   ------------------------- */

object OpenMeteoWeatherCodeMapper {
    @JvmStatic
    fun toCondition(code: Int): WeatherCondition = when (code) {
        200, 201, 202 -> WeatherCondition.THUNDERSTORM
        210, 211, 212 -> WeatherCondition.THUNDER
        221, 230, 231, 232 -> WeatherCondition.THUNDERSTORM
        300, 301, 302, 310, 311, 312, 313, 314, 321 -> WeatherCondition.RAIN
        500, 501, 502, 503, 504 -> WeatherCondition.RAIN
        511 -> WeatherCondition.SLEET
        600, 601, 602 -> WeatherCondition.SNOW
        611, 612, 613, 614, 615, 616 -> WeatherCondition.SLEET
        620, 621, 622 -> WeatherCondition.SNOW
        701, 711, 721, 731 -> WeatherCondition.HAZE
        741 -> WeatherCondition.FOG
        751, 761, 762 -> WeatherCondition.HAZE
        771, 781 -> WeatherCondition.WIND
        800 -> WeatherCondition.CLEAR
        801, 802 -> WeatherCondition.PARTLY_CLOUDY
        803, 804 -> WeatherCondition.CLOUDY
        else -> WeatherCondition.UNKNOWN
    }
}

/* -------------------------
   XML filter loader (matches XmlHelper.getFilterMap)
   ------------------------- */

private fun loadFilterMapFromXmlRes(context: Context, xmlResId: Int): Map<String, String> {
    val map = mutableMapOf<String, String>()
    if (xmlResId == 0) return map

    var parser: XmlResourceParser? = null
    try {
        parser = context.resources.getXml(xmlResId)
        var type = parser.eventType
        while (type != XmlPullParser.END_DOCUMENT) {
            if (type == XmlPullParser.START_TAG && parser.name == Constants.FILTER_TAG_ITEM) {
                val name = parser.getAttributeValue(null, Constants.FILTER_TAG_NAME)
                val value = parser.getAttributeValue(null, Constants.FILTER_TAG_VALUE)
                if (!name.isNullOrBlank() && !value.isNullOrBlank()) {
                    map[name] = value
                }
            }
            type = parser.next()
        }
    } catch (_: Exception) {
    } finally {
        try { parser?.close() } catch (_: Exception) { }
    }
    return map
}

/* -------------------------
   Provider interface
   ------------------------- */

interface Provider {
    val id: String
    val name: String
    val packageName: String?
    val supportsAnimated: Boolean
    val sampleIconPath: String?

    fun getWeatherDrawable(context: Context, condition: WeatherCondition, dayTime: Boolean): Drawable?
    fun getWeatherAnimators(context: Context, condition: WeatherCondition, dayTime: Boolean): Array<Animator?>
}

/* -------------------------
   Icon-pack provider (ported)
   ------------------------- */

open class IconPackProvider(
    c: Context,
    pkgName: String
) : Provider {
    protected var mContext: Context
    override var id: String = pkgName
    override var name: String = pkgName
    override val packageName: String = pkgName
    override var supportsAnimated: Boolean = true
    override var sampleIconPath: String? = null

    protected var mDrawableFilter: Map<String, String> = HashMap()
    protected var mAnimatorFilter: Map<String, String> = HashMap()

    init {
        try {
            mContext = c.createPackageContext(pkgName, Context.CONTEXT_INCLUDE_CODE or Context.CONTEXT_IGNORE_SECURITY)
            val manager = mContext.packageManager
            val info = manager.getApplicationInfo(pkgName, PackageManager.GET_META_DATA)
            name = manager.getApplicationLabel(info).toString()
            supportsAnimated = info.metaData?.getBoolean("supports_animated_weather_icons", true) ?: true

            // read filter xml resource ids from metadata
            val meta = info.metaData
            val drawableResId = meta?.getInt(Constants.META_DATA_DRAWABLE_FILTER, 0) ?: 0
            val animatorResId = meta?.getInt(Constants.META_DATA_ANIMATOR_FILTER, 0) ?: 0

            val finalDrawableXml = if (drawableResId == 0) {
                val maybe = meta?.getString(Constants.META_DATA_DRAWABLE_FILTER)
                if (!maybe.isNullOrBlank()) mContext.resources.getIdentifier(maybe, "xml", pkgName) else 0
            } else drawableResId

            val finalAnimatorXml = if (animatorResId == 0) {
                val maybe = meta?.getString(Constants.META_DATA_ANIMATOR_FILTER)
                if (!maybe.isNullOrBlank()) mContext.resources.getIdentifier(maybe, "xml", pkgName) else 0
            } else animatorResId

            mDrawableFilter = if (finalDrawableXml != 0) loadFilterMapFromXmlRes(mContext, finalDrawableXml) else HashMap()
            mAnimatorFilter = if (finalAnimatorXml != 0) loadFilterMapFromXmlRes(mContext, finalAnimatorXml) else HashMap()
            sampleIconPath = WeatherIconProviderRegistry.getProviderDrawablePath(mContext, this, 800, true, false)
        } catch (e: Exception) {
            // fallback to application context (empty filters)
            try {
                mContext = c.applicationContext
            } catch (_: Exception) {
                throw e
            }
            mDrawableFilter = HashMap()
            mAnimatorFilter = HashMap()
        }
    }

    override fun getWeatherDrawable(context: Context, condition: WeatherCondition, dayTime: Boolean): Drawable? {
        val resName = getWeatherIconName(condition, dayTime) ?: return null
        return try {
            val resId = getResId(mContext, resName, "drawable")
            if (resId == 0) null else ResourcesCompat.getDrawable(mContext.resources, resId, null)
        } catch (_: Exception) {
            null
        }
    }

    override fun getWeatherAnimators(context: Context, condition: WeatherCondition, dayTime: Boolean): Array<Animator?> {
        val ret = arrayOfNulls<Animator>(3)
        for (i in 1..3) {
            val resName = getWeatherAnimatorName(condition, dayTime, i) ?: run { ret[i - 1] = null; continue }
            val resId = getResId(mContext, resName, "animator")
            if (resId != 0) {
                try {
                    ret[i - 1] = AnimatorInflater.loadAnimator(mContext, resId)
                } catch (_: Exception) {
                    ret[i - 1] = null
                }
            } else {
                ret[i - 1] = null
            }
        }
        return ret
    }

    open fun getWeatherIconName(condition: WeatherCondition?, daytime: Boolean): String? {
        val key = innerGetWeatherIconName(condition, daytime)
        return mDrawableFilter[key] ?: key
    }

    open fun getWeatherIconName(condition: WeatherCondition?, daytime: Boolean, index: Int): String? {
        val key = innerGetWeatherIconName(condition, daytime) + Constants.SEPARATOR + index
        return mDrawableFilter[key] ?: key
    }

    open fun getWeatherAnimatorName(condition: WeatherCondition?, daytime: Boolean, index: Int): String? {
        val key = innerGetWeatherAnimatorName(condition, daytime) + Constants.SEPARATOR + index
        return mAnimatorFilter[key] ?: key
    }

    companion object {
        private fun innerGetWeatherIconName(condition: WeatherCondition?, daytime: Boolean): String {
            return Constants.getResourcesName(condition) + Constants.SEPARATOR + (if (daytime) Constants.DAY else Constants.NIGHT)
        }

        private fun innerGetWeatherAnimatorName(condition: WeatherCondition?, daytime: Boolean): String {
            return Constants.getResourcesName(condition) + Constants.SEPARATOR + (if (daytime) Constants.DAY else Constants.NIGHT)
        }

        private fun getResId(context: Context, resName: String, type: String): Int {
            return context.resources.getIdentifier(resName, type, context.packageName)
        }

        @JvmStatic
        fun isIconPackProvider(context: Context, packageName: String): Boolean {
            try {
                val infoList = context.packageManager.queryIntentActivities(Intent(Constants.ACTION_ICON_PROVIDER), PackageManager.GET_RESOLVED_FILTER)
                for (info in infoList) if (packageName == info.activityInfo.applicationInfo.packageName) return true
                val gList = context.packageManager.queryIntentActivities(Intent(Constants.GEOMETRIC_ACTION_ICON_PROVIDER), PackageManager.GET_RESOLVED_FILTER)
                for (info in gList) if (packageName == info.activityInfo.applicationInfo.packageName) return true
            } catch (_: Exception) { }
            return false
        }
    }
}

/* -------------------------
   Registry (public API)
   ------------------------- */

object WeatherIconProviderRegistry {

    @Volatile
    private var providers: List<Provider> = listOf()

    /** List installed providers metadata (default + discovered icon packs) */
    @JvmStatic
    fun listInstalledProviders(context: Context): String {
        ensureLoaded(context, true)
        return Json.encodeToString( providers.map {
            WeatherIconProviderInfo(
                id = it.id,
                name = it.name,
                packageName = it.packageName,
                sampleIconPath = it.sampleIconPath,
                supportsAnimated = it.supportsAnimated
            )
        })
    }

    /**
     * Return Drawable resolved from providerRef (id or package name), Open-Meteo code, day/night.
     * This prefers provider drawables; animated animator resources are available through getWeatherAnimators().
     */
    @JvmStatic
    fun getDrawable(
        context: Context,
        providerRef: String,
        openMeteoCode: Int,
        isDay: Boolean,
        preferAnimated: Boolean = false
    ): Drawable? {
        ensureLoaded(context)
        val condition = OpenMeteoWeatherCodeMapper.toCondition(openMeteoCode)
        val provider = providers.firstOrNull { it.id == providerRef }

        if (provider != null) {
            // Prefer provider drawable (Breezy's behavior: animators are separate resources)
            provider.getWeatherDrawable(context, condition, isDay)?.let { return it }
        }

        return null
    }

    /**
     * Return Animator[] resolved for providerRef (id or package name), Open-Meteo code, day/night.
     * This loads up to three animators (index 1..3) as Breezy does.
     */
    @JvmStatic
    fun getWeatherAnimators(
        context: Context,
        providerRef: String,
        openMeteoCode: Int,
        isDay: Boolean
    ): Array<Animator?>? {
        ensureLoaded(context)
        val condition = OpenMeteoWeatherCodeMapper.toCondition(openMeteoCode)
        val provider = providers.firstOrNull { it.id == providerRef }
        if (provider != null) {

            val anims = provider.getWeatherAnimators(context, condition, isDay)
            // If provider returned all nulls and it's not default, fallback to default provider animators
            if (anims.all { it == null }) {
                return null
            }
            return anims
        }
        return null
    }

    /**
     * Return Animator[] resolved for providerRef (id or package name), Open-Meteo code, day/night.
     * This loads up to three animators (index 1..3) as Breezy does.
     */
    @JvmStatic
    fun getPackageInfo(
        context: Context,
        providerRef: String,
    ): String? {
        ensureLoaded(context)
        val provider = providers.firstOrNull { it.id == providerRef }
        if (provider != null) {
            val provider = IconPackProvider(context, providerRef)
            
            return Json.encodeToString(WeatherIconProviderInfo(
                id = provider.id,
                name = provider.name,
                packageName = provider.packageName,
                sampleIconPath = provider.sampleIconPath,
                supportsAnimated = provider.supportsAnimated
            ))
        }
        return null
    }

    /**
     * Return resource path string for drawable OR animator. Preference:
     * 1) if preferAnimated && provider supplies animator[1] -> animator path
     * 2) provider drawable
     * 3) fallback default animator/drawable
     *
     * Returned path examples:
     *  - android.resource://com.example.pack/animator/weather_clear_day_1
     *  - android.resource://com.example.pack/drawable/weather_clear_day
     */
    @JvmStatic
    fun getDrawablePath(
        context: Context,
        providerRef: String,
        openMeteoCode: Int,
        isDay: Boolean,
        preferAnimated: Boolean = false
    ): String? {
        ensureLoaded(context)
        val provider = providers.firstOrNull { it.id == providerRef }
        return getProviderDrawablePath(context, provider, openMeteoCode, isDay, preferAnimated)
    }

    fun getProviderDrawablePath(
        context: Context,
        provider: Provider?,
        openMeteoCode: Int,
        isDay: Boolean,
        preferAnimated: Boolean = false
    ): String? {
        if (provider == null) {
            return null
        }
        val condition = OpenMeteoWeatherCodeMapper.toCondition(openMeteoCode)

        val baseKey = Constants.getResourcesName(condition) + Constants.SEPARATOR + (if (isDay) Constants.DAY else Constants.NIGHT)

        // 1) provider animator (index 1)
        if (preferAnimated && provider.supportsAnimated && provider is IconPackProvider) {
            val animatorName = provider.getWeatherAnimatorName(condition, isDay, 1)
            if (!animatorName.isNullOrBlank()) {
                val pkg = provider.packageName ?: context.packageName
                val resId = try {
                    val ctx = if (provider.packageName == null) context else context.createPackageContext(pkg, Context.CONTEXT_INCLUDE_CODE or Context.CONTEXT_IGNORE_SECURITY)
                    ctx.resources.getIdentifier(animatorName, "animator", pkg)
                } catch (_: Exception) { 0 }
                if (resId != 0) return "android.resource://$pkg/animator/$animatorName"
            }
        }

        // 2) provider drawable
        if (provider is IconPackProvider) {
            val resName = provider.getWeatherIconName(condition, isDay) ?: baseKey
            val pkg = provider.packageName ?: context.packageName
            val id = try {
                val ctx = if (provider.packageName == null) context else context.createPackageContext(pkg, Context.CONTEXT_INCLUDE_CODE or Context.CONTEXT_IGNORE_SECURITY)
                ctx.resources.getIdentifier(resName, "drawable", pkg)
            } catch (_: Exception) { 0 }
            if (id != 0) return "android.resource://$pkg/drawable/$resName"
        }

        return null
    }

    private fun ensureLoaded(context: Context, force: Boolean = false) {
        if (providers.size == 0 || force) {
            providers = discoverProviders(context)
        }
    }

    private fun discoverProviders(context: Context): List<Provider> {
        val list = mutableListOf<Provider>()

        try {
            val infoList = context.packageManager.queryIntentActivities(Intent(Constants.ACTION_ICON_PROVIDER), PackageManager.GET_RESOLVED_FILTER)
            for (info in infoList) {
                val pkg = info.activityInfo.applicationInfo.packageName
                try { list += IconPackProvider(context, pkg) } catch (_: Exception) { }
            }
        } catch (_: Exception) { }

        try {
            val gList = context.packageManager.queryIntentActivities(Intent(Constants.GEOMETRIC_ACTION_ICON_PROVIDER), PackageManager.GET_RESOLVED_FILTER)
            for (info in gList) {
                val pkg = info.activityInfo.applicationInfo.packageName
                try { list += IconPackProvider(context, pkg) } catch (_: Exception) { }
            }
        } catch (_: Exception) { }

        return list.distinctBy { it.id }
    }
}

/* -------------------------
   Examples (usage)
   ------------------------- */

// fun exampleListProviders(context: Context) {
//     val list = WeatherIconProviderRegistry.listInstalledProviders(context)
//     list.forEach { println("id=${it.id}, name=${it.name}, animated=${it.supportsAnimated}") }
// }

fun exampleGetDrawablePath(context: Context, providerRef: String, openMeteoCode: Int, isDay: Boolean) {
    val path = WeatherIconProviderRegistry.getDrawablePath(context, providerRef, openMeteoCode, isDay, preferAnimated = true)
    println("resolved path: $path")
}

fun exampleGetDrawable(context: Context, providerRef: String, openMeteoCode: Int, isDay: Boolean) =
    WeatherIconProviderRegistry.getDrawable(context, providerRef, openMeteoCode, isDay, preferAnimated = true)

fun exampleGetAnimators(context: Context, providerRef: String, openMeteoCode: Int, isDay: Boolean) =
    WeatherIconProviderRegistry.getWeatherAnimators(context, providerRef, openMeteoCode, isDay)