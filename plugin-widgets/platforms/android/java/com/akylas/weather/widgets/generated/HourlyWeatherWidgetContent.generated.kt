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
import com.akylas.weather.widgets.HourlyData
import com.akylas.weather.widgets.WidgetComposables
import com.akylas.weather.widgets.WidgetLoadingState
import kotlin.math.min
import kotlinx.serialization.json.*

/**
 * Generated content for Hourly Forecast
 * DO NOT EDIT - This file is auto-generated from JSON layout definitions
 */

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 360, heightDp = 150)
@Preview(widthDp = 120, heightDp = 120)
@Preview(widthDp = 260, heightDp = 120)
@Composable
private fun Preview() {
    val fakeWeatherWidgetData = WeatherWidgetData(
        temperature = "12 °C",
        locationName = "Paris",
        description = "Partly Cloudy",
        date = "Mon, Feb 24",
        hourlyData = listOf(HourlyData(time = "06:00", temperature = "6 °C", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm", windSpeed = "10 km/h"), HourlyData(time = "07:00", temperature = "7 °C", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm", windSpeed = "10 km/h"), HourlyData(time = "08:00", temperature = "8 °C", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm", windSpeed = "12 km/h"), HourlyData(time = "09:00", temperature = "10 °C", iconPath = "icon_themes/meteocons/images/500d.png", precipAccumulation = "0 mm", windSpeed = "12 km/h"), HourlyData(time = "10:00", temperature = "12 °C", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm", windSpeed = "14 km/h"), HourlyData(time = "11:00", temperature = "13 °C", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm", windSpeed = "14 km/h"), HourlyData(time = "12:00", temperature = "14 °C", iconPath = "icon_themes/meteocons/images/500d.png", precipAccumulation = "0.2 mm", windSpeed = "16 km/h"), HourlyData(time = "13:00", temperature = "14 °C", iconPath = "icon_themes/meteocons/images/500d.png", precipAccumulation = "0.5 mm", windSpeed = "16 km/h")),
        lastUpdate = System.currentTimeMillis(),
        loadingState = WidgetLoadingState.LOADED
    )
    HourlyWeatherWidgetContent(
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
fun HourlyWeatherWidgetContent(config: WidgetConfig, data: WeatherWidgetData) {
    val context = LocalContext.current
    val fontScale = context.resources.configuration.fontScale
    val ignoreFontScale = config.settings?.get("ignoreFontScale")?.jsonPrimitive?.booleanOrNull ?: false
    val fontScaleFactor = if (ignoreFontScale) 1.0f/fontScale else 1.0f;
    val size = LocalSize.current
    val widgetColor = run { val colorValue = when { config.settings?.get("color")?.jsonPrimitive?.contentOrNull == null -> GlanceTheme.colors.onSurface; else -> config.settings?.get("color")?.jsonPrimitive?.contentOrNull }; if (colorValue is String) ColorProvider(Color(colorValue.toColorIntRgba())) else GlanceTheme.colors.onSurface }

    Column(
        modifier = GlanceModifier.padding(horizontal = (min((size.width.value * 0.05f), 10.0f)).dp, vertical = (min((size.height.value * 0.07f), 6.0f)).dp),
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
        verticalAlignment = Alignment.Vertical.Top,
    ) {
        if (size.height.value >= 80) {
            Column(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Horizontal.Start,
            ) {
                Text(
                    text = data.locationName,
                    style = TextStyle(fontSize = (12 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)), textAlign = TextAlign.Start),
                    maxLines = 1
                )
                Spacer(modifier = GlanceModifier.height(2.dp))
            }
        }
        Row {
            data.hourlyData.take(8).forEach { item ->
                Column(
                    modifier = GlanceModifier.width((56).dp).fillMaxHeight().padding(horizontal = (2).dp),
                    horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    Text(
                        text = item.time,
                        style = TextStyle(fontSize = when { size.height.value < 60 -> 9.sp; else -> 11.sp }, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f))),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.height(when { size.height.value < 60 -> 0.dp; else -> 2.dp }))
                    WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                        Image(
                           provider = provider,
                           contentDescription = item.iconPath,
                           modifier = GlanceModifier.size(when { size.height.value < 60 -> 24.dp; size.height.value < 80 -> 28.dp; else -> 32.dp })
                        )
                    }
                    Spacer(modifier = GlanceModifier.height(when { size.height.value < 60 -> 0.dp; else -> 2.dp }))
                    Text(
                        text = item.temperature,
                        style = TextStyle(fontSize = when { size.height.value < 60 -> 12.sp; else -> 14.sp }, fontWeight = FontWeight.Bold, color = widgetColor),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.height(when { size.height.value < 60 -> 0.dp; else -> 2.dp }))
                    if ((size.height.value >= 60 && "item.precipAccumulation" != null)) {
                        Column(
                            modifier = GlanceModifier,
                        ) {
                            if (size.height.value >= 60) {
                                Spacer(modifier = GlanceModifier.height(2.dp))
                            }
                            Text(
                                text = item.precipAccumulation,
                                style = TextStyle(fontSize = when { size.height.value < 80 -> 9.sp; else -> 10.sp }, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)))
                            )
                        }
                    }
                }
            }
        }
    }
}

// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager