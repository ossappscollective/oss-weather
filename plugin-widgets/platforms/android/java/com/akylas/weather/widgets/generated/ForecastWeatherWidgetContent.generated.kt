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
import com.akylas.weather.widgets.WidgetLoadingState
import kotlin.math.min
import kotlinx.serialization.json.*

/**
 * Generated content for Detailed Forecast
 * DO NOT EDIT - This file is auto-generated from JSON layout definitions
 */

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 300, heightDp = 300)
@Preview(widthDp = 160, heightDp = 300)
@Preview(widthDp = 260, heightDp = 400)
@Composable
private fun Preview() {
    val fakeWeatherWidgetData = WeatherWidgetData(
        temperature = "12°",
        locationName = "Paris",
        description = "Partly Cloudy",
        iconPath = "icon_themes/meteocons/images/800d.png",
        date = "Mon, Feb 24",
        hourlyData = listOf(HourlyData(time = "06:00", temperature = "6°", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm"), HourlyData(time = "07:00", temperature = "7°", iconPath = "icon_themes/meteocons/images/800d.png", precipAccumulation = "0 mm"), HourlyData(time = "08:00", temperature = "8°", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm"), HourlyData(time = "09:00", temperature = "10°", iconPath = "icon_themes/meteocons/images/500n.png", precipAccumulation = "0 mm"), HourlyData(time = "10:00", temperature = "12°", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm"), HourlyData(time = "11:00", temperature = "13°", iconPath = "icon_themes/meteocons/images/802d.png", precipAccumulation = "0 mm")),
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
        modifier = GlanceModifier,
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
        verticalAlignment = Alignment.Vertical.Top,
    ) {
        Row(
            modifier = GlanceModifier.fillMaxWidth().padding(horizontal = (min((size.width.value * 0.05f), 10.0f)).dp, vertical = (min((size.height.value * 0.07f), 6.0f)).dp),
            horizontalAlignment = Alignment.Horizontal.Start,
            verticalAlignment = Alignment.Vertical.Top,
        ) {
            Column(
                modifier = GlanceModifier,
                horizontalAlignment = Alignment.Horizontal.Start,
                verticalAlignment = Alignment.Vertical.Top,
            ) {
                Text(
                    text = data.locationName,
                    style = TextStyle(fontSize = (12 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)), textAlign = TextAlign.Start),
                    maxLines = 1
                )
                Text(
                    text = data.temperature,
                    style = TextStyle(fontSize = (26 * fontScaleFactor).sp, fontWeight = FontWeight.Bold, color = widgetColor)
                )
            }
            Spacer(modifier = GlanceModifier.defaultWeight())
            Column(
                modifier = GlanceModifier,
                horizontalAlignment = Alignment.Horizontal.End,
                verticalAlignment = Alignment.Vertical.Bottom,
            ) {
                if ("data.iconPath" != null) {
                    WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                        Image(
                           provider = provider,
                           contentDescription = data.iconPath,
                           modifier = GlanceModifier.size(54.dp)
                        )
                    }
                }
                if ("data.description" != null) {
                    Text(
                        text = data.description,
                        style = TextStyle(fontSize = (11 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)), textAlign = TextAlign.End),
                        maxLines = 1
                    )
                }
            }
        }
        Spacer(modifier = GlanceModifier.height(8.dp))
        Column(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Horizontal.Start,
            verticalAlignment = Alignment.Vertical.Top,
        ) {
            Text(
                modifier = GlanceModifier.padding(horizontal = (8).dp),
                text = context.getString(
                    context.resources.getIdentifier(
                        "hourly",
                        "string",
                        context.packageName
                    )
                ),
                style = TextStyle(fontSize = (12 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)), textAlign = TextAlign.Start)
            )
        }
        Spacer(modifier = GlanceModifier.height(4.dp))
        Row {
            data.hourlyData.take(8).forEach { item ->
                Column(
                    modifier = GlanceModifier.width((53).dp).padding(horizontal = (4).dp),
                    horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    Text(
                        text = item.time,
                        style = TextStyle(fontSize = (10 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f))),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                        Image(
                           provider = provider,
                           contentDescription = item.iconPath,
                           modifier = GlanceModifier.size(28.dp)
                        )
                    }
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    Text(
                        text = item.temperature,
                        style = TextStyle(fontSize = (12 * fontScaleFactor).sp, fontWeight = FontWeight.Bold, color = widgetColor),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    if ("item.precipAccumulation" != null) {
                        Text(
                            text = item.precipAccumulation,
                            style = TextStyle(fontSize = (9 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)))
                        )
                    }
                }
            }
        }
        Spacer(modifier = GlanceModifier.height(16.dp))
        Column(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Horizontal.Start,
            verticalAlignment = Alignment.Vertical.Top,
        ) {
            Text(
                modifier = GlanceModifier.padding(horizontal = (8).dp),
                text = context.getString(
                    context.resources.getIdentifier(
                        "daily",
                        "string",
                        context.packageName
                    )
                ),
                style = TextStyle(fontSize = (12 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)), textAlign = TextAlign.Start)
            )
        }
        Spacer(modifier = GlanceModifier.height(4.dp))
        LazyColumn {
            items(data.dailyData.take(10)) { item ->
                Column(
                    modifier = GlanceModifier.fillMaxWidth().padding((2).dp),
                    horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    Column(
                        modifier = GlanceModifier.fillMaxWidth().padding(horizontal = (6).dp, vertical = (2).dp).background(GlanceTheme.colors.surfaceVariant).cornerRadius((8).dp),
                        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        Row(
                            modifier = GlanceModifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                            verticalAlignment = Alignment.Vertical.CenterVertically,
                        ) {
                            Text(
                                text = item.day,
                                style = TextStyle(fontSize = (12 * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                maxLines = 1
                            )
                            Spacer(modifier = GlanceModifier.defaultWeight())
                            WeatherWidgetManager.getIconImageProviderFromPath(item.iconPath, LocalContext.current)?.let { provider ->
                                Image(
                                   provider = provider,
                                   contentDescription = item.iconPath,
                                   modifier = GlanceModifier.size(36.dp)
                                )
                            }
                            Spacer(modifier = GlanceModifier.defaultWeight())
                            Column(
                                modifier = GlanceModifier,
                                horizontalAlignment = Alignment.Horizontal.End,
                                verticalAlignment = Alignment.Vertical.Bottom,
                            ) {
                                Row(
                                    modifier = GlanceModifier,
                                    horizontalAlignment = Alignment.Horizontal.End,
                                    verticalAlignment = Alignment.Vertical.CenterVertically,
                                ) {
                                    Text(
                                        text = item.temperatureHigh,
                                        style = TextStyle(fontSize = (13 * fontScaleFactor).sp, fontWeight = FontWeight.Bold, color = widgetColor),
                                        maxLines = 1
                                    )
                                    Spacer(modifier = GlanceModifier.width(6.dp))
                                    Text(
                                        text = item.temperatureLow,
                                        style = TextStyle(fontSize = (13 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f))),
                                        maxLines = 1
                                    )
                                }
                                Row(
                                    modifier = GlanceModifier,
                                    horizontalAlignment = Alignment.Horizontal.End,
                                    verticalAlignment = Alignment.Vertical.CenterVertically,
                                ) {
                                    if ("item.precipAccumulation" != null) {
                                        Text(
                                            text = item.precipAccumulation,
                                            style = TextStyle(fontSize = (10 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)))
                                        )
                                    }
                                    Spacer(modifier = GlanceModifier.width(6.dp))
                                    if ("item.precipitation" != null) {
                                        Text(
                                            text = "💧" + item.precipitation,
                                            style = TextStyle(fontSize = (10 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.5f)))
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager