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
import com.akylas.weather.widgets.WidgetModern
import androidx.glance.text.FontFamily
import com.akylas.weather.widgets.WidgetLoadingState
import kotlin.math.max
import kotlin.math.min
import kotlinx.serialization.json.*

/**
 * Generated content for Detailed Forecast
 * DO NOT EDIT - This file is auto-generated from JSON layout definitions
 */

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 320, heightDp = 320)
@Preview(widthDp = 320, heightDp = 460)
@Composable
private fun Preview() {
    val fakeWeatherWidgetData = WeatherWidgetData(
        temperature = "12°",
        locationName = "Paris",
        description = "Partly Cloudy",
        iconPath = "icon_themes/meteocons/images/800.png",
        date = "Mon, Feb 24",
        hourlyData = listOf(HourlyData(time = "06:00", temperature = "6°", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm"), HourlyData(time = "07:00", temperature = "7°", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm"), HourlyData(time = "08:00", temperature = "8°", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm"), HourlyData(time = "09:00", temperature = "10°", iconPath = "icon_themes/meteocons/images/500d.png", precipAccumulation = "0 mm"), HourlyData(time = "10:00", temperature = "12°", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm"), HourlyData(time = "11:00", temperature = "13°", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm")),
        dailyData = listOf(DailyData(day = "Mon", iconPath = "icon_themes/meteocons/images/800d.png", temperatureHigh = "12°", temperatureLow = "4°", precipAccumulation = "0 mm"), DailyData(day = "Tue", iconPath = "icon_themes/meteocons/images/802d.png", temperatureHigh = "14°", temperatureLow = "6°", precipAccumulation = "0 mm"), DailyData(day = "Wed", iconPath = "icon_themes/meteocons/images/500d.png", temperatureHigh = "10°", temperatureLow = "5°", precipAccumulation = "0 mm"), DailyData(day = "Thu", iconPath = "icon_themes/meteocons/images/802d.png", temperatureHigh = "9°", temperatureLow = "3°", precipAccumulation = "0 mm"), DailyData(day = "Fri", iconPath = "icon_themes/meteocons/images/800d.png", temperatureHigh = "11°", temperatureLow = "4°", precipAccumulation = "0 mm"), DailyData(day = "Sat", iconPath = "icon_themes/meteocons/images/803d.png", temperatureHigh = "15°", temperatureLow = "7°", precipAccumulation = "0 mm")),
        lastUpdate = System.currentTimeMillis(),
        loadingState = WidgetLoadingState.LOADED
    )
    ForecastWeatherWidgetContent(
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
fun ForecastWeatherWidgetContent(config: WidgetConfig, data: WeatherWidgetData) {
    val context = LocalContext.current
    val fontScale = context.resources.configuration.fontScale
    val ignoreFontScale = config.settings?.get("ignoreFontScale")?.jsonPrimitive?.booleanOrNull ?: false
    val fontScaleFactor = if (ignoreFontScale) 1.0f/fontScale else 1.0f;
    val size = LocalSize.current
    val widgetColor = run { val colorValue = when { config.settings?.get("color")?.jsonPrimitive?.contentOrNull == null -> GlanceTheme.colors.onSurface; else -> config.settings?.get("color")?.jsonPrimitive?.contentOrNull }; if (colorValue is String) ColorProvider(Color(colorValue.toColorIntRgba())) else GlanceTheme.colors.onSurface }

    Column(
        modifier = GlanceModifier.fillMaxSize().padding((14).dp),
    ) {
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.Vertical.Top,
        ) {
            Column(
                modifier = GlanceModifier.defaultWeight(),
            ) {
                Text(
                    text = data.locationName,
                    style = TextStyle(fontSize = (12 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                    maxLines = 1
                )
                Text(
                    text = data.temperature,
                    style = TextStyle(fontSize = (min((size.width.value * 0.15f), min((size.height.value * 0.15f), 50.0f)) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                    maxLines = 1
                )
                Text(
                    text = data.description,
                    style = TextStyle(fontSize = (14 * fontScaleFactor).sp, color = widgetColor),
                    maxLines = 1
                )
                Row(
                    modifier = GlanceModifier,
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    Text(
                        text = data.temperatureLow,
                        style = TextStyle(fontSize = (14 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = data.temperatureHigh,
                        style = TextStyle(fontSize = (14 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                        maxLines = 1
                    )
                }
            }
            if (data.iconPath.isNotEmpty()) {
                WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                    Image(
                       provider = provider,
                       contentDescription = data.iconPath,
                       modifier = GlanceModifier.size((min((size.width.value * 0.26f), min((size.height.value * 0.26f), 80.0f)) * 1.3f).dp)
                    )
                }
            }
        }
        Spacer(modifier = GlanceModifier.height(6.dp))
        WidgetModern.Chips(
            chips = data.chips,
            color = widgetColor,
            fontSize = 12f * fontScaleFactor,
            iconSize = 14f * fontScaleFactor,
            spacing = 4f,
            limit = 6,
            maxWidth = (size.width.value - 28.0f),
            maxRows = 2,
            modifier = GlanceModifier
        )
        Spacer(modifier = GlanceModifier.height(10.dp))
        if (size.height.value >= 380) {
            Column(
                modifier = GlanceModifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = GlanceModifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                    ) {
                        data.hourlyData.take(when { size.width.value >= 330 -> 6; else -> 5 }).forEach { item ->
                            Column(
                                modifier = GlanceModifier.defaultWeight(),
                                horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                            ) {
                                Text(
                                    text = item.hour,
                                    style = TextStyle(fontSize = (11 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                    maxLines = 1
                                )
                                WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                                    Image(
                                       provider = provider,
                                       contentDescription = item.iconPath,
                                       modifier = GlanceModifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                    WidgetModern.HourlyChart(
                        hours = data.hourlyData,
                        limit = when { size.width.value >= 330 -> 6; else -> 5 },
                        height = 80.dp,
                        color = widgetColor,
                        fontSize = 12f * fontScaleFactor,
                        modifier = GlanceModifier.fillMaxWidth()
                    )
                }
                Spacer(modifier = GlanceModifier.height(8.dp))
            }
        }
        else {
            Column(
                modifier = GlanceModifier.fillMaxWidth(),
            ) {
            }
        }
        data.dailyData.take(when { size.height.value >= 380 -> when { size.height.value >= 565 -> 6; size.height.value >= 522 -> 5; size.height.value >= 479 -> 4; size.height.value >= 436 -> 3; size.height.value >= 393 -> 2; else -> 1 }; else -> when { size.height.value >= 356 -> 4; size.height.value >= 313 -> 3; size.height.value >= 270 -> 2; else -> 1 } }).forEach { item ->
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
                            WidgetModern.Chips(
                                chips = item.chips,
                                color = widgetColor,
                                fontSize = 11f * fontScaleFactor,
                                iconSize = 12f * fontScaleFactor,
                                spacing = 3f,
                                limit = 3,
                                maxWidth = (size.width.value - 270.0f),
                                maxRows = 1,
                                modifier = GlanceModifier
                            )
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

// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager