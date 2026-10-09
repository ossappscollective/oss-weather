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
import com.akylas.weather.widgets.WidgetModern
import androidx.glance.text.FontFamily
import com.akylas.weather.widgets.WidgetLoadingState
import kotlin.math.max
import kotlin.math.min
import kotlinx.serialization.json.*

/**
 * Generated content for Weather with Date
 * DO NOT EDIT - This file is auto-generated from JSON layout definitions
 */

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 300, heightDp = 60)
@Preview(widthDp = 165, heightDp = 100)
@Preview(widthDp = 180, heightDp = 60)
@Preview(widthDp = 80, heightDp = 80)
@Preview(widthDp = 160, heightDp = 160)
@Preview(widthDp = 320, heightDp = 180)
@Preview(widthDp = 320, heightDp = 400)
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

    if (size.height.value < 70) {
        if (size.width.value < 220) {
            Row(
                modifier = GlanceModifier.fillMaxSize().padding(horizontal = (12).dp),
                verticalAlignment = Alignment.Vertical.CenterVertically,
            ) {
                if (data.iconPath.isNotEmpty()) {
                    WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                        Image(
                           provider = provider,
                           contentDescription = data.iconPath,
                           modifier = GlanceModifier.size((min((size.height.value * 0.5f), 28.0f)).dp)
                        )
                    }
                }
                Spacer(modifier = GlanceModifier.width(8.dp))
                Column(
                    modifier = GlanceModifier.defaultWeight(),
                ) {
                    Text(
                        text = android.text.format.DateFormat.getMediumDateFormat(context).format(java.util.Date()),
                        style = TextStyle(fontSize = (max(min((size.width.value * 0.07f), min((size.height.value * 0.25f), 15.0f)), 11.0f) * fontScaleFactor).sp, color = widgetColor, fontWeight = FontWeight.Medium)
                    )
                    Text(
                        text = data.locationName,
                        style = TextStyle(fontSize = (max(min((size.width.value * 0.05f), min((size.height.value * 0.18f), 11.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                        maxLines = 1
                    )
                }
                Spacer(modifier = GlanceModifier.width(4.dp))
                Text(
                    text = data.temperature,
                    style = TextStyle(fontSize = (max(min((size.width.value * 0.1f), min((size.height.value * 0.35f), 18.0f)), 13.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                    maxLines = 1
                )
            }
        }
        else {
            Row(
                modifier = GlanceModifier.fillMaxSize().padding(horizontal = (14).dp, vertical = (8).dp),
                verticalAlignment = Alignment.Vertical.CenterVertically,
            ) {
                Column(
                    modifier = GlanceModifier.defaultWeight(),
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
                        style = TextStyle(fontSize = (max(min(((size.width.value - 128.0f) / 3.4f), min((size.height.value * 0.42f), 56.0f)), 9.0f) * fontScaleFactor).sp, color = widgetColor, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"))
                    )
                    Text(
                        text = android.text.format.DateFormat.getLongDateFormat(context).format(java.util.Date()),
                        style = TextStyle(fontSize = (max(min((size.width.value * 0.05f), min((size.height.value * 0.13f), 13.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f)))
                    )
                }
                Column(
                    modifier = GlanceModifier,
                    horizontalAlignment = Alignment.Horizontal.End,
                ) {
                    Row(
                        modifier = GlanceModifier,
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        if (data.iconPath.isNotEmpty()) {
                            WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                Image(
                                   provider = provider,
                                   contentDescription = data.iconPath,
                                   modifier = GlanceModifier.size((min((size.width.value * 0.1f), min((size.height.value * 0.28f), 32.0f)) * 1.3f).dp)
                                )
                            }
                        }
                        Spacer(modifier = GlanceModifier.width(4.dp))
                        Text(
                            text = data.temperature,
                            style = TextStyle(fontSize = (min((size.width.value * 0.1f), min((size.height.value * 0.25f), 28.0f)) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                            maxLines = 1
                        )
                    }
                    Row(
                        modifier = GlanceModifier,
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        Text(
                            text = data.temperatureLow,
                            style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.12f), 13.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.width(4.dp))
                        Text(
                            text = data.temperatureHigh,
                            style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.12f), 13.0f)), 10.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
    else {
        if (size.width.value < 110) {
            Column(
                modifier = GlanceModifier.fillMaxSize(),
                horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                verticalAlignment = Alignment.Vertical.CenterVertically,
            ) {
                if (data.iconPath.isNotEmpty()) {
                    WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                        Image(
                           provider = provider,
                           contentDescription = data.iconPath,
                           modifier = GlanceModifier.size((min((size.width.value * 0.36f), min((size.height.value * 0.27f), 36.0f)) * 1.3f).dp)
                        )
                    }
                }
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
                    style = TextStyle(fontSize = (max(min((size.width.value * 0.14f), min((size.height.value * 0.13f), 15.0f)), 11.0f) * fontScaleFactor).sp, color = widgetColor, fontWeight = FontWeight.Medium)
                )
                Row(
                    modifier = GlanceModifier,
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    Text(
                        text = data.temperatureLow,
                        style = TextStyle(fontSize = (max(min((size.width.value * 0.12f), min((size.height.value * 0.12f), 13.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = data.temperatureHigh,
                        style = TextStyle(fontSize = (max(min((size.width.value * 0.12f), min((size.height.value * 0.12f), 13.0f)), 10.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                        maxLines = 1
                    )
                }
            }
        }
        else {
            if (size.width.value < 220) {
                if (size.height.value < 130) {
                    Row(
                        modifier = GlanceModifier.fillMaxSize().padding(horizontal = (12).dp),
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        Column(
                            modifier = GlanceModifier.defaultWeight(),
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
                                style = TextStyle(fontSize = (max(min(((size.width.value - 80.0f) / 3.4f), min((size.height.value * 0.3f), 34.0f)), 9.0f) * fontScaleFactor).sp, color = widgetColor, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"))
                            )
                            Text(
                                text = data.locationName,
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.07f), min((size.height.value * 0.12f), 12.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                maxLines = 1
                            )
                        }
                        Column(
                            modifier = GlanceModifier,
                            horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                        ) {
                            if (data.iconPath.isNotEmpty()) {
                                WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                    Image(
                                       provider = provider,
                                       contentDescription = data.iconPath,
                                       modifier = GlanceModifier.size((min((size.height.value * 0.4f), 44.0f) * 1.3f).dp)
                                    )
                                }
                            }
                            Text(
                                text = data.temperature,
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.12f), min((size.height.value * 0.2f), 20.0f)), 13.0f) * fontScaleFactor).sp, color = widgetColor),
                                maxLines = 1
                            )
                        }
                    }
                }
                else {
                    Column(
                        modifier = GlanceModifier.fillMaxSize().padding((12).dp),
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
                            style = TextStyle(fontSize = (max(min(((size.width.value - 24.0f) / 3.4f), min((size.height.value * 0.2f), 34.0f)), 9.0f) * fontScaleFactor).sp, color = widgetColor, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"))
                        )
                        Text(
                            text = android.text.format.DateFormat.format("yyyy", java.util.Date()).toString(),
                            style = TextStyle(fontSize = (max(min((size.width.value * 0.08f), min((size.height.value * 0.08f), 12.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f)))
                        )
                        Spacer(modifier = GlanceModifier.defaultWeight())
                        Row(
                            modifier = GlanceModifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Vertical.CenterVertically,
                        ) {
                            Column(
                                modifier = GlanceModifier.defaultWeight(),
                            ) {
                                Text(
                                    text = data.temperature,
                                    style = TextStyle(fontSize = (min((size.width.value * 0.15f), min((size.height.value * 0.15f), 24.0f)) * fontScaleFactor).sp, color = widgetColor),
                                    maxLines = 1
                                )
                                Text(
                                    text = data.locationName,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.08f), min((size.height.value * 0.08f), 12.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                    maxLines = 1
                                )
                            }
                            if (data.iconPath.isNotEmpty()) {
                                WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                    Image(
                                       provider = provider,
                                       contentDescription = data.iconPath,
                                       modifier = GlanceModifier.size((min((size.width.value * 0.26f), min((size.height.value * 0.26f), 44.0f)) * 1.3f).dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
            else {
                if (size.height.value >= 150) {
                    Column(
                        modifier = GlanceModifier.fillMaxSize().padding((18).dp),
                    ) {
                        Row(
                            modifier = GlanceModifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Vertical.Top,
                        ) {
                            Column(
                                modifier = GlanceModifier.defaultWeight(),
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
                                    style = TextStyle(fontSize = (max(min(((size.width.value - 126.0f) / 3.4f), min((size.height.value * 0.26f), 64.0f)), 9.0f) * fontScaleFactor).sp, color = widgetColor, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"))
                                )
                                Text(
                                    text = android.text.format.DateFormat.getLongDateFormat(context).format(java.util.Date()),
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.05f), min((size.height.value * 0.08f), 15.0f)), 11.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f)))
                                )
                            }
                            Column(
                                modifier = GlanceModifier,
                                horizontalAlignment = Alignment.Horizontal.End,
                            ) {
                                if (data.iconPath.isNotEmpty()) {
                                    WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                        Image(
                                           provider = provider,
                                           contentDescription = data.iconPath,
                                           modifier = GlanceModifier.size((min((size.width.value * 0.16f), min((size.height.value * 0.26f), 56.0f)) * 1.3f).dp)
                                        )
                                    }
                                }
                                Text(
                                    text = data.temperature,
                                    style = TextStyle(fontSize = (min((size.width.value * 0.1f), min((size.height.value * 0.18f), 36.0f)) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                                    maxLines = 1
                                )
                            }
                        }
                        Spacer(modifier = GlanceModifier.height(6.dp))
                        Row(
                            modifier = GlanceModifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Vertical.CenterVertically,
                        ) {
                            Text(
                                modifier = GlanceModifier.defaultWeight(),
                                text = data.locationName + " · " + data.description,
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.08f), 15.0f)), 11.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                maxLines = 1
                            )
                            Row(
                                modifier = GlanceModifier,
                                verticalAlignment = Alignment.Vertical.CenterVertically,
                            ) {
                                Text(
                                    text = data.temperatureLow,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.08f), 15.0f)), 11.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                    maxLines = 1
                                )
                                Spacer(modifier = GlanceModifier.width(4.dp))
                                Text(
                                    text = data.temperatureHigh,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.08f), 15.0f)), 11.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                    maxLines = 1
                                )
                            }
                        }
                        Spacer(modifier = GlanceModifier.height(10.dp))
                        if ((config.settings?.get("showHourly")?.jsonPrimitive?.booleanOrNull == true && size.height.value >= 300)) {
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
                        data.dailyData.take(when { (config.settings?.get("showHourly")?.jsonPrimitive?.booleanOrNull == true && size.height.value >= 300) -> when { size.height.value >= 500 -> 4; size.height.value >= 457 -> 3; size.height.value >= 414 -> 2; size.height.value >= 371 -> 1; else -> 0 }; else -> when { size.height.value >= 455 -> 6; size.height.value >= 412 -> 5; size.height.value >= 369 -> 4; size.height.value >= 326 -> 3; size.height.value >= 283 -> 2; size.height.value >= 240 -> 1; else -> 0 } }).forEach { item ->
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
                else {
                    Row(
                        modifier = GlanceModifier.fillMaxSize().padding(horizontal = (14).dp, vertical = (8).dp),
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        Column(
                            modifier = GlanceModifier.defaultWeight(),
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
                                style = TextStyle(fontSize = (max(min(((size.width.value - 128.0f) / 3.4f), min((size.height.value * 0.42f), 56.0f)), 9.0f) * fontScaleFactor).sp, color = widgetColor, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"))
                            )
                            Text(
                                text = android.text.format.DateFormat.getLongDateFormat(context).format(java.util.Date()),
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.05f), min((size.height.value * 0.13f), 13.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f)))
                            )
                        }
                        Column(
                            modifier = GlanceModifier,
                            horizontalAlignment = Alignment.Horizontal.End,
                        ) {
                            Row(
                                modifier = GlanceModifier,
                                verticalAlignment = Alignment.Vertical.CenterVertically,
                            ) {
                                if (data.iconPath.isNotEmpty()) {
                                    WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                        Image(
                                           provider = provider,
                                           contentDescription = data.iconPath,
                                           modifier = GlanceModifier.size((min((size.width.value * 0.1f), min((size.height.value * 0.28f), 32.0f)) * 1.3f).dp)
                                        )
                                    }
                                }
                                Spacer(modifier = GlanceModifier.width(4.dp))
                                Text(
                                    text = data.temperature,
                                    style = TextStyle(fontSize = (min((size.width.value * 0.1f), min((size.height.value * 0.25f), 28.0f)) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                                    maxLines = 1
                                )
                            }
                            Row(
                                modifier = GlanceModifier,
                                verticalAlignment = Alignment.Vertical.CenterVertically,
                            ) {
                                Text(
                                    text = data.temperatureLow,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.12f), 13.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                    maxLines = 1
                                )
                                Spacer(modifier = GlanceModifier.width(4.dp))
                                Text(
                                    text = data.temperatureHigh,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.12f), 13.0f)), 10.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager