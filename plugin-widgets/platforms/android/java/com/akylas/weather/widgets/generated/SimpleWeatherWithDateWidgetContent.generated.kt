package com.akylas.weather.widgets.generated

import android.annotation.SuppressLint
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.appwidget.cornerRadius
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.glance.preview.ExperimentalGlancePreviewApi
import androidx.glance.preview.Preview
import com.akylas.weather.widgets.WeatherWidgetData
import com.akylas.weather.widgets.WeatherWidgetManager
import com.akylas.weather.widgets.WidgetTheme
import com.akylas.weather.widgets.WidgetConfig
import com.akylas.weather.widgets.toColorIntRgba
import com.akylas.weather.widgets.WidgetComposables
import com.akylas.weather.widgets.WidgetLoadingState
import kotlin.math.min
import kotlinx.serialization.json.*

/**
 * Generated content for Weather with Date
 * DO NOT EDIT - This file is auto-generated from JSON layout definitions
 */

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 260, heightDp = 140)
@Preview(widthDp = 120, heightDp = 50)
@Preview(widthDp = 80, heightDp = 80)
@Preview(widthDp = 120, heightDp = 120)
@Composable
private fun Preview() {
    val fakeWeatherWidgetData = WeatherWidgetData(
        temperature = "8°",
        iconPath = "icon_themes/meteocons/images/800.png",
        description = "Partly Cloudy",
        locationName = "Grenoble",
        date = "Mon, Feb 24",
        lastUpdate = System.currentTimeMillis(),
        loadingState = WidgetLoadingState.LOADED
    )
    SimpleWeatherWithDateWidgetContent(
        config = WidgetConfig(), data = fakeWeatherWidgetData,
    )
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 260, heightDp = 120)
@Composable
private fun ErrorPreview() {
    val fakeErrorWeatherWidgetData = WeatherWidgetData(
        loadingState = WidgetLoadingState.ERROR,
        errorMessage = "Unable to fetch weather data"
    )
    GlanceTheme(colors = WidgetTheme.colors) {
        WidgetComposables.WidgetBackground {
            WidgetComposables.NoDataContent(
                WidgetLoadingState.ERROR,
                fakeErrorWeatherWidgetData.errorMessage
            )
        }
    }
}

@SuppressLint("RestrictedApi")
@Composable
fun SimpleWeatherWithDateWidgetContent(config: WidgetConfig, data: WeatherWidgetData) {
    val context = LocalContext.current
    val fontScale = context.resources.configuration.fontScale
    val ignoreFontScale = config.settings?.get("ignoreFontScale")?.jsonPrimitive?.booleanOrNull ?: false
    val fontScaleFactor = if (ignoreFontScale) 1.0f/fontScale else 1.0f;
    val size = LocalSize.current
    val widgetColor = run { val colorValue = when { config.settings?.get("color")?.jsonPrimitive?.contentOrNull == null -> GlanceTheme.colors.onSurface; else -> config.settings?.get("color")?.jsonPrimitive?.contentOrNull }; if (colorValue is String) ColorProvider(Color(colorValue.toColorIntRgba())) else GlanceTheme.colors.onSurface }

    Column(
        modifier = GlanceModifier.fillMaxSize().padding(horizontal = (min((size.width.value * 0.05f), 10.0f)).dp, vertical = (min((size.height.value * 0.07f), 6.0f)).dp),
        verticalAlignment = Alignment.Vertical.CenterVertically,
    ) {
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
        ) {
            Text(
                text = data.locationName,
                style = TextStyle(fontSize = (min((size.width.value * 0.09f), min((size.height.value * 0.27f), 12.0f)) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f))),
                maxLines = 1
            )
            Text(
                modifier = GlanceModifier.defaultWeight(),
                text = data.temperature,
                style = TextStyle(fontSize = (min((size.width.value * 0.2f), min((size.height.value * 0.27f), 20.0f)) * fontScaleFactor).sp, fontWeight = FontWeight.Bold, color = widgetColor, textAlign = TextAlign.End)
            )
        }
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.Vertical.CenterVertically,
        ) {
            Text(
                text = run {
                    val mediumFormat = android.text.format.DateFormat.getMediumDateFormat(context)
                    if (mediumFormat is java.text.SimpleDateFormat) {
                        var pattern = mediumFormat.toPattern()
                        pattern = pattern.replace(Regex("[\\s,./-]*y+[\\s,./-]*"), "").trim()
                        java.text.SimpleDateFormat(pattern, java.util.Locale.getDefault()).format(java.util.Date())
                    } else {
                        mediumFormat.format(java.util.Date())
                    }
                },
                style = TextStyle(fontSize = (min((size.width.value * 0.17f), min((size.height.value * 0.37f), 62.0f)) * fontScaleFactor).sp, color = widgetColor, fontWeight = when { config.settings?.get("clockBold")?.jsonPrimitive?.booleanOrNull == true -> FontWeight.Bold; else -> FontWeight.Normal })
            )
            Spacer(modifier = GlanceModifier.defaultWeight())
            if ("iconPath" != null) {
                WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                    Image(
                       provider = provider,
                       contentDescription = data.iconPath,
                       modifier = GlanceModifier.size((min(when { size.height.value >= 200.0f -> (size.height.value * 0.52f); else -> (size.width.value * 0.27f) }, 100.0f)).dp)
                    )
                }
            }
        }
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
        ) {
            Text(
                text = android.text.format.DateFormat.format("yyyy", java.util.Date()).toString(),
                style = TextStyle(fontSize = (min((size.width.value * 0.09f), min((size.height.value * 0.27f), 14.0f)) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)))
            )
            if ("description" != null) {
                Text(
                    modifier = GlanceModifier.defaultWeight(),
                    text = data.description,
                    style = TextStyle(fontSize = (min((size.width.value * 0.09f), min((size.height.value * 0.27f), 14.0f)) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)), textAlign = TextAlign.End)
                )
            }
        }
    }
}

// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager