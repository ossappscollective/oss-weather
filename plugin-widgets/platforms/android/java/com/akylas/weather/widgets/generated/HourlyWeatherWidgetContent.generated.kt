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
import com.akylas.weather.widgets.DailyData
import com.akylas.weather.widgets.WidgetComposables
import com.akylas.weather.widgets.WidgetTextClock
import com.akylas.weather.widgets.widgetDatePattern
import com.akylas.weather.widgets.WidgetModern
import androidx.glance.text.FontFamily
import com.akylas.weather.widgets.WidgetLoadingState
import kotlin.math.max
import kotlin.math.min
import kotlinx.serialization.json.*

/**
 * Generated content for Hourly Forecast
 * DO NOT EDIT - This file is auto-generated from JSON layout definitions
 */

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 360, heightDp = 200)
@Preview(widthDp = 260, heightDp = 170)
@Preview(widthDp = 300, heightDp = 100)
@Preview(widthDp = 360, heightDp = 430)
@Composable
private fun Preview() {
    val fakeWeatherWidgetData = WeatherWidgetData(
        temperature = "12 °C",
        locationName = "Paris",
        description = "Partly Cloudy",
        date = "Mon, Feb 24",
        hourlyData = listOf(HourlyData(time = "06:00", temperature = "6 °C", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm", windSpeed = "10 km/h"), HourlyData(time = "07:00", temperature = "7 °C", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm", windSpeed = "10 km/h"), HourlyData(time = "08:00", temperature = "8 °C", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm", windSpeed = "12 km/h"), HourlyData(time = "09:00", temperature = "10 °C", iconPath = "icon_themes/meteocons/images/500d.png", precipAccumulation = "0 mm", windSpeed = "12 km/h"), HourlyData(time = "10:00", temperature = "12 °C", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm", windSpeed = "14 km/h"), HourlyData(time = "11:00", temperature = "13 °C", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm", windSpeed = "14 km/h"), HourlyData(time = "12:00", temperature = "14 °C", iconPath = "icon_themes/meteocons/images/500d.png", precipAccumulation = "0.2 mm", windSpeed = "16 km/h"), HourlyData(time = "13:00", temperature = "14 °C", iconPath = "icon_themes/meteocons/images/500d.png", precipAccumulation = "0.5 mm", windSpeed = "16 km/h")),
        dailyData = listOf(DailyData(day = "Mon", iconPath = "icon_themes/meteocons/images/800d.png", temperatureHigh = "12°", temperatureLow = "4°", precipAccumulation = "0 mm"), DailyData(day = "Tue", iconPath = "icon_themes/meteocons/images/802d.png", temperatureHigh = "14°", temperatureLow = "6°", precipAccumulation = "0 mm"), DailyData(day = "Wed", iconPath = "icon_themes/meteocons/images/500d.png", temperatureHigh = "10°", temperatureLow = "5°", precipAccumulation = "0 mm"), DailyData(day = "Thu", iconPath = "icon_themes/meteocons/images/802d.png", temperatureHigh = "9°", temperatureLow = "3°", precipAccumulation = "0 mm"), DailyData(day = "Fri", iconPath = "icon_themes/meteocons/images/800d.png", temperatureHigh = "11°", temperatureLow = "4°", precipAccumulation = "0 mm"), DailyData(day = "Sat", iconPath = "icon_themes/meteocons/images/803d.png", temperatureHigh = "15°", temperatureLow = "7°", precipAccumulation = "0 mm")),
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

    if (size.height.value >= 160) {
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = (6).dp, vertical = (10).dp),
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(horizontal = (8).dp).padding(bottom = (4).dp),
                verticalAlignment = Alignment.Vertical.CenterVertically,
            ) {
                Text(
                    modifier = GlanceModifier.defaultWeight(),
                    text = data.locationName,
                    style = TextStyle(fontSize = (13 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                    maxLines = 1
                )
                Text(
                    text = data.temperature,
                    style = TextStyle(fontSize = (13 * fontScaleFactor).sp, color = widgetColor),
                    maxLines = 1
                )
                Spacer(modifier = GlanceModifier.width(4.dp))
                Text(
                    text = data.description,
                    style = TextStyle(fontSize = (12 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                    maxLines = 1
                )
            }
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
            ) {
                data.hourlyData.take(when { size.width.value >= 400 -> 7; size.width.value >= 330 -> 6; size.width.value >= 260 -> 5; else -> 4 }).forEach { item ->
                    Column(
                        modifier = GlanceModifier.defaultWeight(),
                        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                    ) {
                        Text(
                            text = item.hour,
                            style = TextStyle(fontSize = (12 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.height(2.dp))
                        WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                            Image(
                               provider = provider,
                               contentDescription = item.iconPath,
                               modifier = GlanceModifier.size(22.dp)
                            )
                        }
                        Spacer(modifier = GlanceModifier.height(2.dp))
                        Row(
                            modifier = GlanceModifier,
                            verticalAlignment = Alignment.Vertical.CenterVertically,
                        ) {
                            if (item.wind.iconPath.isNotEmpty()) {
                                WeatherWidgetManager.getIconImageProviderFromPath(item.wind.iconPath, LocalContext.current)?.let { provider ->
                                    Image(
                                       provider = provider,
                                       contentDescription = item.wind.iconPath,
                                       modifier = GlanceModifier.size(11.dp)
                                    )
                                }
                            }
                            Spacer(modifier = GlanceModifier.width(2.dp))
                            Text(
                                text = item.wind.value,
                                style = TextStyle(fontSize = (11 * fontScaleFactor).sp, color = widgetColor),
                                maxLines = 1
                            )
                        }
                    }
                }
            }
            if (size.height.value >= 300) {
                WidgetModern.HourlyChart(
                    hours = data.hourlyData,
                    limit = when { size.width.value >= 400 -> 7; size.width.value >= 330 -> 6; size.width.value >= 260 -> 5; else -> 4 },
                    height = 100.dp,
                    color = widgetColor,
                    fontSize = 13f * fontScaleFactor,
                    modifier = GlanceModifier.fillMaxWidth()
                )
            }
            else {
                WidgetModern.HourlyChart(
                    hours = data.hourlyData,
                    limit = when { size.width.value >= 400 -> 7; size.width.value >= 330 -> 6; size.width.value >= 260 -> 5; else -> 4 },
                    height = (max((size.height.value - 110.0f), 60.0f)).dp,
                    color = widgetColor,
                    fontSize = 13f * fontScaleFactor,
                    modifier = GlanceModifier.fillMaxWidth()
                )
            }
            if (size.height.value >= 300) {
                Spacer(modifier = GlanceModifier.height(8.dp))
            }
            data.dailyData.take(when { size.height.value >= 475 -> 6; size.height.value >= 432 -> 5; size.height.value >= 389 -> 4; size.height.value >= 346 -> 3; size.height.value >= 303 -> 2; size.height.value >= 300 -> 1; else -> 0 }).forEach { item ->
                if (size.width.value < 250) {
                    Row(
                        modifier = GlanceModifier.fillMaxWidth().padding(vertical = (3).dp),
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                            Image(
                               provider = provider,
                               contentDescription = item.iconPath,
                               modifier = GlanceModifier.size(22.dp)
                            )
                        }
                        Spacer(modifier = GlanceModifier.width(6.dp))
                        Text(
                            text = item.day,
                            style = TextStyle(fontSize = (13 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.width(4.dp))
                        Text(
                            modifier = GlanceModifier.defaultWeight(),
                            text = item.date,
                            style = TextStyle(fontSize = (11 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                            maxLines = 1
                        )
                        Row(
                            modifier = GlanceModifier,
                            verticalAlignment = Alignment.Vertical.CenterVertically,
                        ) {
                            Text(
                                text = item.temperatureLow,
                                style = TextStyle(fontSize = (13 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                maxLines = 1
                            )
                            Spacer(modifier = GlanceModifier.width(4.dp))
                            Text(
                                text = item.temperatureHigh,
                                style = TextStyle(fontSize = (13 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                maxLines = 1
                            )
                        }
                    }
                }
                else {
                    Row(
                        modifier = GlanceModifier.fillMaxWidth().padding(vertical = (4).dp),
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                            Image(
                               provider = provider,
                               contentDescription = item.iconPath,
                               modifier = GlanceModifier.size(24.dp)
                            )
                        }
                        Spacer(modifier = GlanceModifier.width(8.dp))
                        Column(
                            modifier = GlanceModifier.defaultWeight(),
                        ) {
                            Row(
                                modifier = GlanceModifier,
                                verticalAlignment = Alignment.Vertical.CenterVertically,
                            ) {
                                Text(
                                    text = item.day,
                                    style = TextStyle(fontSize = (14 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                    maxLines = 1
                                )
                                Spacer(modifier = GlanceModifier.width(4.dp))
                                Text(
                                    text = item.date,
                                    style = TextStyle(fontSize = (12 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                    maxLines = 1
                                )
                                Spacer(modifier = GlanceModifier.width(6.dp))
                                if (config.settings?.get("showChips")?.jsonPrimitive?.booleanOrNull != false) {
                                    WidgetModern.Chips(
                                        chips = item.chips,
                                        color = widgetColor,
                                        fontSize = 11f * fontScaleFactor,
                                        iconSize = 12f * fontScaleFactor,
                                        spacing = 3f,
                                        limit = 3,
                                        maxWidth = (size.width.value - 222.0f),
                                        maxRows = 1,
                                        modifier = GlanceModifier
                                    )
                                }
                                else {
                                    Column(
                                        modifier = GlanceModifier,
                                    ) {
                                    }
                                }
                            }
                            Text(
                                text = item.description,
                                style = TextStyle(fontSize = (12 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                maxLines = 1
                            )
                        }
                        Text(
                            text = item.temperatureLow,
                            style = TextStyle(fontSize = (13 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.width(5.dp))
                        Box(
                            modifier = GlanceModifier.width((30).dp).height((3).dp)
                        ) {
                            Row(
                                modifier = GlanceModifier.width((30).dp).height((3).dp).background(GlanceTheme.colors.surfaceVariant).cornerRadius((2).dp),
                            ) {
                            }
                            Row(
                                modifier = GlanceModifier.height((3).dp),
                            ) {
                                Spacer(modifier = GlanceModifier.width((item.rangeStart * 30).dp))
                                Row(
                                    modifier = GlanceModifier.width((((item.rangeEnd - item.rangeStart) * 30)).dp).height((3).dp).background(Color(0xFFEF9F27)).cornerRadius((2).dp),
                                ) {
                                }
                            }
                        }
                        Spacer(modifier = GlanceModifier.width(5.dp))
                        Text(
                            modifier = GlanceModifier.width((30).dp),
                            text = item.temperatureHigh,
                            style = TextStyle(fontSize = (14 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor, textAlign = TextAlign.End),
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
    else {
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = (6).dp, vertical = (8).dp),
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(horizontal = (8).dp).padding(bottom = (4).dp),
                verticalAlignment = Alignment.Vertical.CenterVertically,
            ) {
                Text(
                    modifier = GlanceModifier.defaultWeight(),
                    text = data.locationName,
                    style = TextStyle(fontSize = (13 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                    maxLines = 1
                )
                Text(
                    text = data.temperature,
                    style = TextStyle(fontSize = (13 * fontScaleFactor).sp, color = widgetColor),
                    maxLines = 1
                )
                Spacer(modifier = GlanceModifier.width(4.dp))
                Text(
                    text = data.description,
                    style = TextStyle(fontSize = (12 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                    maxLines = 1
                )
            }
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
            ) {
                data.hourlyData.take(when { size.width.value >= 400 -> 7; size.width.value >= 330 -> 6; size.width.value >= 260 -> 5; else -> 4 }).forEach { item ->
                    Column(
                        modifier = GlanceModifier.defaultWeight(),
                        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                    ) {
                        Text(
                            text = item.hour,
                            style = TextStyle(fontSize = (12 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.height(2.dp))
                        WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                            Image(
                               provider = provider,
                               contentDescription = item.iconPath,
                               modifier = GlanceModifier.size(22.dp)
                            )
                        }
                        Spacer(modifier = GlanceModifier.height(2.dp))
                        Text(
                            text = item.temperature,
                            style = TextStyle(fontSize = (13 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager