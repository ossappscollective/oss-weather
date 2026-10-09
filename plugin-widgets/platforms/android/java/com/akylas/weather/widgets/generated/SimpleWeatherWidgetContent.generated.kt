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
 * Generated content for Simple Weather
 * DO NOT EDIT - This file is auto-generated from JSON layout definitions
 */

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 160, heightDp = 160)
@Preview(widthDp = 160, heightDp = 100)
@Preview(widthDp = 340, heightDp = 100)
@Preview(widthDp = 80, heightDp = 80)
@Preview(widthDp = 300, heightDp = 140)
@Preview(widthDp = 320, heightDp = 380)
@Preview(widthDp = 170, heightDp = 320)
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
    SimpleWeatherWidgetContent(
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
fun SimpleWeatherWidgetContent(config: WidgetConfig, data: WeatherWidgetData) {
    val context = LocalContext.current
    val fontScale = context.resources.configuration.fontScale
    val ignoreFontScale = config.settings?.get("ignoreFontScale")?.jsonPrimitive?.booleanOrNull ?: false
    val fontScaleFactor = if (ignoreFontScale) 1.0f/fontScale else 1.0f;
    val size = LocalSize.current
    val widgetColor = run { val colorValue = when { config.settings?.get("color")?.jsonPrimitive?.contentOrNull == null -> GlanceTheme.colors.onSurface; else -> config.settings?.get("color")?.jsonPrimitive?.contentOrNull }; if (colorValue is String) ColorProvider(Color(colorValue.toColorIntRgba())) else GlanceTheme.colors.onSurface }

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
                       modifier = GlanceModifier.size((min((size.width.value * 0.5f), min((size.height.value * 0.4f), 56.0f)) * 1.3f).dp)
                    )
                }
            }
            Text(
                text = data.temperature,
                style = TextStyle(fontSize = (max(min((size.width.value * 0.24f), min((size.height.value * 0.2f), 26.0f)), 14.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                maxLines = 1
            )
            if (size.height.value >= 110) {
                Text(
                    text = data.locationName,
                    style = TextStyle(fontSize = (10 * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                    maxLines = 1
                )
            }
            else {
                Column(
                    modifier = GlanceModifier.fillMaxWidth(),
                ) {
                }
            }
        }
    }
    else {
        if (size.height.value >= 250) {
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
                            style = TextStyle(fontSize = (min((size.width.value * 0.08f), min((size.height.value * 0.05f), 15.0f)) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                            maxLines = 1
                        )
                        Text(
                            text = data.temperature,
                            style = TextStyle(fontSize = (min((size.width.value * 0.25f), min((size.height.value * 0.16f), 58.0f)) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                            maxLines = 1
                        )
                        Text(
                            text = data.description,
                            style = TextStyle(fontSize = (min((size.width.value * 0.08f), min((size.height.value * 0.05f), 15.0f)) * fontScaleFactor).sp, color = widgetColor),
                            maxLines = 1
                        )
                        Row(
                            modifier = GlanceModifier,
                            verticalAlignment = Alignment.Vertical.CenterVertically,
                        ) {
                            Text(
                                text = data.temperatureLow,
                                style = TextStyle(fontSize = (min((size.width.value * 0.08f), min((size.height.value * 0.05f), 15.0f)) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                maxLines = 1
                            )
                            Spacer(modifier = GlanceModifier.width(4.dp))
                            Text(
                                text = data.temperatureHigh,
                                style = TextStyle(fontSize = (min((size.width.value * 0.08f), min((size.height.value * 0.05f), 15.0f)) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                maxLines = 1
                            )
                        }
                    }
                    if (data.iconPath.isNotEmpty()) {
                        WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                            Image(
                               provider = provider,
                               contentDescription = data.iconPath,
                               modifier = GlanceModifier.size((min((size.width.value * 0.3f), min((size.height.value * 0.22f), 80.0f)) * 1.3f).dp)
                            )
                        }
                    }
                }
                Spacer(modifier = GlanceModifier.height(8.dp))
                if (config.settings?.get("showChips")?.jsonPrimitive?.booleanOrNull != false) {
                    WidgetModern.Chips(
                        chips = data.chips,
                        color = widgetColor,
                        fontSize = max(min((size.width.value * 0.065f), min((size.height.value * 0.04f), 13.0f)), 11.0f) * fontScaleFactor,
                        iconSize = max(min((size.width.value * 0.075f), min((size.height.value * 0.045f), 15.0f)), 12.0f) * fontScaleFactor,
                        spacing = 4f,
                        limit = 6,
                        maxWidth = (size.width.value - 28.0f),
                        maxRows = 2,
                        modifier = GlanceModifier
                    )
                }
                else {
                    Column(
                        modifier = GlanceModifier,
                    ) {
                    }
                }
                Spacer(modifier = GlanceModifier.height(10.dp))
                data.dailyData.take(when { size.height.value >= 438 -> 6; size.height.value >= 395 -> 5; size.height.value >= 352 -> 4; size.height.value >= 309 -> 3; size.height.value >= 266 -> 2; else -> 1 }).forEach { item ->
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
            if (size.width.value >= 220) {
                if (size.height.value < 140) {
                    Row(
                        modifier = GlanceModifier.fillMaxSize().padding(horizontal = (14).dp, vertical = (8).dp),
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        Column(
                            modifier = GlanceModifier.defaultWeight(),
                        ) {
                            Text(
                                text = data.temperature,
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.13f), min((size.height.value * 0.36f), 40.0f)), 20.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                                maxLines = 1
                            )
                            Row(
                                modifier = GlanceModifier.fillMaxWidth(),
                                verticalAlignment = Alignment.Vertical.CenterVertically,
                            ) {
                                Text(
                                    modifier = GlanceModifier.defaultWeight(),
                                    text = data.description,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.13f), 13.0f)), 11.0f) * fontScaleFactor).sp, color = widgetColor),
                                    maxLines = 1
                                )
                                Spacer(modifier = GlanceModifier.width(6.dp))
                                Row(
                                    modifier = GlanceModifier,
                                    verticalAlignment = Alignment.Vertical.CenterVertically,
                                ) {
                                    Text(
                                        text = data.temperatureLow,
                                        style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.13f), 13.0f)), 11.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                        maxLines = 1
                                    )
                                    Spacer(modifier = GlanceModifier.width(4.dp))
                                    Text(
                                        text = data.temperatureHigh,
                                        style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.13f), 13.0f)), 11.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                        maxLines = 1
                                    )
                                }
                            }
                        }
                        Spacer(modifier = GlanceModifier.width(6.dp))
                        if (config.settings?.get("showChips")?.jsonPrimitive?.booleanOrNull != false) {
                            WidgetModern.Chips(
                                chips = data.chips,
                                color = widgetColor,
                                fontSize = max(min((size.width.value * 0.035f), min((size.height.value * 0.11f), 12.0f)), 10.0f) * fontScaleFactor,
                                iconSize = max(min((size.width.value * 0.04f), min((size.height.value * 0.13f), 14.0f)), 12.0f) * fontScaleFactor,
                                spacing = 4f,
                                limit = 6,
                                maxWidth = (size.width.value * 0.4f),
                                maxRows = 2,
                                modifier = GlanceModifier
                            )
                        }
                        else {
                            Column(
                                modifier = GlanceModifier,
                            ) {
                            }
                        }
                        Spacer(modifier = GlanceModifier.width(8.dp))
                        if (data.iconPath.isNotEmpty()) {
                            WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                Image(
                                   provider = provider,
                                   contentDescription = data.iconPath,
                                   modifier = GlanceModifier.size((min((size.width.value * 0.15f), min((size.height.value * 0.5f), 60.0f)) * 1.3f).dp)
                                )
                            }
                        }
                    }
                }
                else {
                    Column(
                        modifier = GlanceModifier.fillMaxSize().padding((12).dp),
                    ) {
                        Row(
                            modifier = GlanceModifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Vertical.Top,
                        ) {
                            Column(
                                modifier = GlanceModifier.defaultWeight(),
                            ) {
                                Text(
                                    text = data.temperature,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.13f), min((size.height.value * 0.3f), 44.0f)), 22.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                                    maxLines = 1
                                )
                                Text(
                                    text = data.description,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.1f), 14.0f)), 11.0f) * fontScaleFactor).sp, color = widgetColor),
                                    maxLines = 1
                                )
                                Row(
                                    modifier = GlanceModifier,
                                    verticalAlignment = Alignment.Vertical.CenterVertically,
                                ) {
                                    Text(
                                        text = data.temperatureLow,
                                        style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.1f), 14.0f)), 11.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                        maxLines = 1
                                    )
                                    Spacer(modifier = GlanceModifier.width(4.dp))
                                    Text(
                                        text = data.temperatureHigh,
                                        style = TextStyle(fontSize = (max(min((size.width.value * 0.045f), min((size.height.value * 0.1f), 14.0f)), 11.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                        maxLines = 1
                                    )
                                }
                            }
                            if (data.iconPath.isNotEmpty()) {
                                WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                    Image(
                                       provider = provider,
                                       contentDescription = data.iconPath,
                                       modifier = GlanceModifier.size((min((size.width.value * 0.16f), min((size.height.value * 0.42f), 72.0f)) * 1.3f).dp)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = GlanceModifier.height(6.dp))
                        if (config.settings?.get("showChips")?.jsonPrimitive?.booleanOrNull != false) {
                            WidgetModern.Chips(
                                chips = data.chips,
                                color = widgetColor,
                                fontSize = max(min((size.width.value * 0.04f), min((size.height.value * 0.09f), 12.0f)), 10.0f) * fontScaleFactor,
                                iconSize = max(min((size.width.value * 0.045f), min((size.height.value * 0.1f), 14.0f)), 12.0f) * fontScaleFactor,
                                spacing = 4f,
                                limit = 6,
                                maxWidth = (size.width.value - 24.0f),
                                maxRows = when { size.height.value >= 170 -> 2; else -> 1 },
                                modifier = GlanceModifier
                            )
                        }
                        else {
                            Column(
                                modifier = GlanceModifier,
                            ) {
                            }
                        }
                        Spacer(modifier = GlanceModifier.defaultWeight())
                        if (size.height.value >= 150) {
                            Text(
                                text = data.locationName,
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.04f), min((size.height.value * 0.09f), 11.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                maxLines = 1
                            )
                        }
                        else {
                            Column(
                                modifier = GlanceModifier.fillMaxWidth(),
                            ) {
                            }
                        }
                    }
                }
            }
            else {
                Column(
                    modifier = GlanceModifier.fillMaxSize().padding((12).dp),
                ) {
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Vertical.Top,
                    ) {
                        Column(
                            modifier = GlanceModifier.defaultWeight(),
                        ) {
                            Text(
                                text = data.temperature,
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.24f), min((size.height.value * 0.26f), 44.0f)), 22.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily("sans-serif-light"), color = widgetColor),
                                maxLines = 1
                            )
                            Text(
                                text = data.description,
                                style = TextStyle(fontSize = (max(min((size.width.value * 0.075f), min((size.height.value * 0.075f), 13.0f)), 11.0f) * fontScaleFactor).sp, color = widgetColor),
                                maxLines = 1
                            )
                            Row(
                                modifier = GlanceModifier,
                                verticalAlignment = Alignment.Vertical.CenterVertically,
                            ) {
                                Text(
                                    text = data.temperatureLow,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.075f), min((size.height.value * 0.075f), 13.0f)), 11.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                                    maxLines = 1
                                )
                                Spacer(modifier = GlanceModifier.width(4.dp))
                                Text(
                                    text = data.temperatureHigh,
                                    style = TextStyle(fontSize = (max(min((size.width.value * 0.075f), min((size.height.value * 0.075f), 13.0f)), 11.0f) * fontScaleFactor).sp, fontWeight = FontWeight.Medium, color = widgetColor),
                                    maxLines = 1
                                )
                            }
                        }
                        if (data.iconPath.isNotEmpty()) {
                            WeatherWidgetManager.getIconImageProviderFromPath(data.iconPath, LocalContext.current)?.let { provider ->
                                Image(
                                   provider = provider,
                                   contentDescription = data.iconPath,
                                   modifier = GlanceModifier.size((min((size.width.value * 0.28f), min((size.height.value * 0.4f), 56.0f)) * 1.3f).dp)
                                )
                            }
                        }
                    }
                    Spacer(modifier = GlanceModifier.height(6.dp))
                    if (size.height.value >= 140) {
                        if (config.settings?.get("showChips")?.jsonPrimitive?.booleanOrNull != false) {
                            WidgetModern.Chips(
                                chips = data.chips,
                                color = widgetColor,
                                fontSize = max(min((size.width.value * 0.065f), min((size.height.value * 0.065f), 12.0f)), 10.0f) * fontScaleFactor,
                                iconSize = max(min((size.width.value * 0.075f), min((size.height.value * 0.075f), 14.0f)), 12.0f) * fontScaleFactor,
                                spacing = 4f,
                                limit = 6,
                                maxWidth = (size.width.value - 24.0f),
                                maxRows = when { size.height.value >= 170 -> 2; else -> 1 },
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
                    else {
                        Column(
                            modifier = GlanceModifier.fillMaxWidth(),
                        ) {
                        }
                    }
                    Spacer(modifier = GlanceModifier.defaultWeight())
                    if (size.height.value >= 170) {
                        Text(
                            text = data.locationName,
                            style = TextStyle(fontSize = (max(min((size.width.value * 0.065f), min((size.height.value * 0.065f), 11.0f)), 10.0f) * fontScaleFactor).sp, color = ColorProvider(widgetColor.getColor(context).copy(alpha = 0.6f))),
                            maxLines = 1
                        )
                    }
                    else {
                        Column(
                            modifier = GlanceModifier.fillMaxWidth(),
                        ) {
                        }
                    }
                }
            }
        }
    }
}

// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager