package com.akylas.weather.widgets

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.net.Uri
import androidx.core.content.ContextCompat

/**
 * Loads a drawable from another app (icon packs) given an
 * android.resource://pkg/drawable/name uri. Null for any other uri, or on failure.
 * Replaces com.nativescript.image.DrawableUtils, removed from ui-image 5.x.
 */
object DrawableUtils {
    @JvmStatic
    fun tryLoadExternalDrawable(context: Context?, uri: Uri): Drawable? {
        return try {
            if (context == null || uri.scheme != "android.resource") return null
            val pkg = uri.host
            if (pkg == null || pkg == context.packageName) return null
            val segments = uri.pathSegments
            if (segments.size < 2) return null
            val remoteContext = context.createPackageContext(pkg, 0)
            val resId = remoteContext.resources.getIdentifier(segments[1], segments[0], pkg)
            if (resId == 0) null else ContextCompat.getDrawable(remoteContext, resId)
        } catch (t: Exception) {
            WidgetsLogger.e("DrawableUtils", "External load failed: $uri", t)
            null
        }
    }
}

/**
 * Parse color hex strings supporting:
 *  - #rrggbbaa (RGBA)  <- your case
 *  - #aarrggbb (AARRGGBB)
 *  - #rrggbb
 *  - #rgb
 *  - #rgba
 *
 * Returns an Android color int (AARRGGBB).
 */
fun String.toColorIntRgba(): Int {
    var hex = this.trim()
    if (hex.startsWith("#")) hex = hex.substring(1)
    if (hex.isEmpty()) throw IllegalArgumentException("Empty color string")

    // Expand shorthand forms
    when (hex.length) {
        3 -> {
            // rgb -> rrggbb, add full alpha
            val r = "${hex[0]}${hex[0]}"
            val g = "${hex[1]}${hex[1]}"
            val b = "${hex[2]}${hex[2]}"
            hex = "FF$r$g$b" // AARRGGBB
        }
        4 -> {
            // rgba -> rrggbbaa -> convert to aarrggbb
            val r = "${hex[0]}${hex[0]}"
            val g = "${hex[1]}${hex[1]}"
            val b = "${hex[2]}${hex[2]}"
            val a = "${hex[3]}${hex[3]}"
            hex = a + r + g + b
        }
        6 -> {
            // rrggbb -> prefix alpha FF
            hex = "FF$hex"
        }
        8 -> {
            // ambiguous: treat as rrggbbaa (RGBA) per project expectation -> convert to aarrggbb
            val rrggbb = hex.substring(0, 6)
            val aa = hex.substring(6, 8)
            hex = aa + rrggbb
        }
        else -> throw IllegalArgumentException("Unsupported color format: $this")
    }

    // Now hex is AARRGGBB
    return Color.parseColor("#$hex")
}