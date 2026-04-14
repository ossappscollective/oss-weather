package com.akylas.weather.widgets

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.action.actionStartActivity
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.action.ActionParameters
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.akylas.weather.widgets.WeatherWidgetManager.getOpenAppOnTap

object WidgetComposables {

    val openSettingsTypeKey = ActionParameters.Key<String>("openSettings")

    @Composable
    fun NoDataContent(
        loadingState: WidgetLoadingState = WidgetLoadingState.NONE,
        errorMessage: String = ""
    ) {
        val context = LocalContext.current
        val openOnClick = getOpenAppOnTap(context)
        val launchIntent = if (openOnClick) null else WeatherWidgetManager.createAppLaunchIntent(context)
        val openAction = launchIntent?.let { actionStartActivity(it.component!!) }
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .then(if (openAction != null) GlanceModifier.clickable(openAction) else GlanceModifier)
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.Vertical.CenterVertically
            ) {
                when (loadingState) {
                    WidgetLoadingState.LOADING -> {
                        Text(
                            text = "⟳",
                            style = TextStyle(
                                color = GlanceTheme.colors.onBackground,
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = GlanceModifier.height(8.dp))
                        Text(
                            text = context.getString(R.string.widget_loading),
                            style = TextStyle(
                                color = GlanceTheme.colors.onBackground,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium
                            )
                        )
                    }
                    
                    WidgetLoadingState.ERROR -> {
                        Text(
                            text = "⚠️",
                            style = TextStyle(
                                color = GlanceTheme.colors.error,
                                fontSize = 32.sp
                            )
                        )
                        Spacer(modifier = GlanceModifier.height(8.dp))
                        Text(
                            text = errorMessage.ifEmpty { context.getString(R.string.widget_error_loading) },
                            style = TextStyle(
                                color = GlanceTheme.colors.onBackground,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                textAlign = TextAlign.Center
                            )
                        )
                        Spacer(modifier = GlanceModifier.height(4.dp))
                        Text(
                            text = context.getString(R.string.widget_tap_configure),
                            style = TextStyle(
                                color = GlanceTheme.colors.onSurfaceVariant,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        )
                    }
                    
                    else -> {
                        Text(
                            text = context.getString(R.string.widget_no_location),
                            style = TextStyle(
                                color = GlanceTheme.colors.onBackground,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                textAlign = TextAlign.Center
                            )
                        )
                        Spacer(modifier = GlanceModifier.height(4.dp))
                        Text(
                            text = context.getString(R.string.widget_tap_configure),
                            style = TextStyle(
                                color = GlanceTheme.colors.onSurfaceVariant,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        )
                    }
                }
            }
        }
    }

    @Composable
    fun WidgetBackground(
        enabled: Boolean = true,
        modifier: GlanceModifier = GlanceModifier,
        color: ColorProvider? = GlanceTheme.colors.widgetBackground,
        content: @Composable () -> Unit,
    ) {
        val context = LocalContext.current
        val providedColor = color ?: GlanceTheme.colors.widgetBackground
        val composeColor = providedColor.getColor(context)
        val alpha = if (composeColor != null) composeColor.alpha else 1f
        val openOnClick = getOpenAppOnTap(context)

        // If we could extract the color, split alpha and tint color (tint must not carry alpha)
        val tintColorProvider = if (composeColor != null) {
            val tintColor = Color(red = composeColor.red, green = composeColor.green, blue = composeColor.blue, alpha = 1f)
            ColorProvider(tintColor)
        } else {
            // fallback: use provided color as tint (may ignore any alpha)
            providedColor
        }
        
        val launchIntent = if (openOnClick) WeatherWidgetManager.createAppLaunchIntent(context) else null
        val openAction = launchIntent?.let { 
            actionStartActivity(it.component!!, actionParametersOf(openSettingsTypeKey to "false"))
         }
        Box(
            modifier = modifier.fillMaxSize().then(
                if (enabled) GlanceModifier.background(
                    imageProvider = ImageProvider(R.drawable.app_widget_background),
                    alpha = alpha,
                    colorFilter = ColorFilter.tint(tintColorProvider)
                ) else GlanceModifier
            ).then(if (openAction != null) GlanceModifier.clickable(openAction) else GlanceModifier)
        ) {
            content()
        }
    }

    @Composable
    fun WidgetContainer(
        padding: Dp = 8.dp,
        modifier: GlanceModifier = GlanceModifier,
        content: @Composable () -> Unit
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            content()
        }
    }
}
