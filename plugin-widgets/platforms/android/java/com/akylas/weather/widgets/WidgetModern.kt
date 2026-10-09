package com.akylas.weather.widgets

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/**
 * Modern style building blocks of the widgets (the "chips" and "hourlyChart" layout elements)
 */
object WidgetModern {

    private const val BAR_WIDTH = 24f
    private const val CURVE_COLOR = 0xFFEF9F27.toInt()

    private fun parseColor(value: String, fallback: Int): Int =
        if (value.isEmpty()) fallback else runCatching { value.toColorIntRgba() }.getOrDefault(fallback)

    private const val CHIP_PADDING = 7f
    private const val CHIP_ICON_GAP = 3f

    // chip width in dp: padding, icon, gap, value and unit (same estimate in ModernComponents.swift)
    private fun chipWidth(chip: WidgetChip, iconSize: Float, valuePaint: Paint, unitPaint: Paint, density: Float): Float {
        val text = valuePaint.measureText(chip.value) + if (chip.unit.isNotEmpty()) unitPaint.measureText(" " + chip.unit) else 0f
        return 2 * CHIP_PADDING + iconSize + CHIP_ICON_GAP + text / density
    }

    // widgets have no flow layout: chips fill rows in order while they fit (packChips in app/utils/widgetChips.ts)
    private fun packChips(widths: List<Float>, maxWidth: Float, spacing: Float, maxRows: Int): List<List<Int>> {
        val rows = mutableListOf<MutableList<Int>>()
        var rowWidth = 0f
        for ((index, width) in widths.withIndex()) {
            val current = rows.lastOrNull()
            if (current != null && rowWidth + spacing + width <= maxWidth) {
                current.add(index)
                rowWidth += spacing + width
            } else if (rows.size < maxRows && width <= maxWidth) {
                rows.add(mutableListOf(index))
                rowWidth = width
            } else {
                break
            }
        }
        return rows
    }

    /**
     * Weather data chips like the app: soft rounded pills sized to their content, wrapping on up to
     * maxRows rows of maxWidth (dp). Chips that do not fit are not shown
     */
    @Composable
    fun Chips(
        chips: List<WidgetChip>,
        color: ColorProvider = GlanceTheme.colors.onSurface,
        fontSize: Float = 12f,
        iconSize: Float = 14f,
        spacing: Float = 4f,
        limit: Int = 4,
        maxWidth: Float = Float.MAX_VALUE,
        maxRows: Int = 1,
        modifier: GlanceModifier = GlanceModifier
    ) {
        val metrics = LocalContext.current.resources.displayMetrics
        @Suppress("DEPRECATION")
        val textScale = metrics.scaledDensity
        val valuePaint = Paint().apply {
            textSize = fontSize * textScale
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        val unitPaint = Paint().apply { textSize = fontSize * 0.8f * textScale }
        val shown = chips.take(limit)
        val rows = packChips(shown.map { chipWidth(it, iconSize, valuePaint, unitPaint, metrics.density) }, maxWidth, spacing, maxRows)
        Column(modifier = modifier) {
            rows.forEachIndexed { rowIndex, row ->
                if (rowIndex > 0) {
                    Spacer(modifier = GlanceModifier.height(spacing.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    row.forEachIndexed { index, chipIndex ->
                        if (index > 0) {
                            Spacer(modifier = GlanceModifier.width(spacing.dp))
                        }
                        Chip(shown[chipIndex], color, fontSize, iconSize, textScale / metrics.density)
                    }
                }
            }
        }
    }

    @Composable
    fun Chip(chip: WidgetChip, color: ColorProvider, fontSize: Float, iconSize: Float, textScale: Float) {
        val context = LocalContext.current
        val background = if (chip.tint.isNotEmpty()) Color(parseColor(chip.tint, 0)) else GlanceTheme.colors.onSurface.getColor(context).copy(alpha = 0.06f)
        val hasBar = chip.barFraction > 0f
        // fully rounded ends: half of the chip height
        val height = maxOf(iconSize, fontSize * textScale * 1.2f + if (hasBar) 3f else 0f) + 4f
        val icon = WeatherWidgetManager.getIconImageProviderFromPath(chip.iconPath, context)
        Row(
            modifier = GlanceModifier.height(height.dp).background(background).cornerRadius((height / 2).dp).padding(horizontal = CHIP_PADDING.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            icon?.let { Image(provider = it, contentDescription = null, modifier = GlanceModifier.size(iconSize.dp)) }
            Spacer(modifier = GlanceModifier.width(CHIP_ICON_GAP.dp))
            Column {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(text = chip.value, style = TextStyle(color = color, fontSize = fontSize.sp, fontWeight = FontWeight.Medium), maxLines = 1)
                    if (chip.unit.isNotEmpty()) {
                        Text(
                            text = " " + chip.unit,
                            style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant, fontSize = (fontSize * 0.8f).sp),
                            maxLines = 1
                        )
                    }
                }
                if (hasBar) {
                    Box(
                        modifier = GlanceModifier
                            .width((BAR_WIDTH * chip.barFraction).coerceAtLeast(3f).dp)
                            .height(2.dp)
                            .cornerRadius(1.dp)
                            .background(Color(parseColor(chip.barColor, 0xFF378ADD.toInt())))
                    ) {}
                }
            }
        }
    }

    /**
     * The app hourly card chart: temperature curve with its values, precipitation bars with their amount
     * and probability (drawn like HourlyItem.svelte). Drawn to a bitmap (Glance cannot draw paths), columns match a row of equal weights
     */
    @Composable
    fun HourlyChart(
        hours: List<HourlyData>,
        limit: Int,
        height: Dp,
        color: ColorProvider = GlanceTheme.colors.onSurface,
        fontSize: Float = 13f,
        modifier: GlanceModifier = GlanceModifier
    ) {
        val context = LocalContext.current
        val shown = hours.take(limit)
        if (shown.isEmpty()) {
            return
        }
        val density = context.resources.displayMetrics.density
        val widthPx = (LocalSize.current.width.value * density).toInt().coerceAtLeast(1)
        val heightPx = (height.value * density).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val textColor = color.getColor(context).toArgb()
        val secondaryColor = GlanceTheme.colors.onSurfaceVariant.getColor(context).toArgb()
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = fontSize * density
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            this.color = textColor
        }
        val smallPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = fontSize * 0.85f * density
            textAlign = Paint.Align.CENTER
        }
        val columnWidth = widthPx.toFloat() / shown.size
        // curve band: under the values, above the precipitation bars (at most half of the height)
        val curveTop = textPaint.textSize * 1.4f
        val curveBottom = heightPx * 0.5f
        val points = shown.mapIndexed { index, hour ->
            Pair(columnWidth * (index + 0.5f), curveBottom - hour.curve * (curveBottom - curveTop))
        }
        // precipitation like the app hourly item: rounded bars from the bottom, the amount at the bottom
        // and the probability above it, over the bars
        val barPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val inset = 3 * density
        shown.forEachIndexed { index, hour ->
            val left = columnWidth * index
            hour.precipBars.forEach { bar ->
                val top = bar.top * (heightPx - 10 * density)
                val bottom = heightPx - inset
                val radius = minOf(4 * density, (bottom - top) / 2)
                barPaint.color = parseColor(bar.color, 0x73378ADD)
                canvas.drawRoundRect(RectF(left + columnWidth * bar.start + inset, top, left + columnWidth * bar.end - inset, bottom), radius, radius, barPaint)
            }
            val x = points[index].first
            var deltaY = 4 * density + 2
            if (hour.precipAmount.isNotEmpty()) {
                smallPaint.color = textColor
                smallPaint.typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                canvas.drawText(hour.precipAmount, x, heightPx - deltaY, smallPaint)
                deltaY += 13 * density
            }
            if (hour.precipProbability.isNotEmpty()) {
                smallPaint.color = secondaryColor
                smallPaint.typeface = Typeface.DEFAULT
                canvas.drawText(hour.precipProbability, x, heightPx - deltaY, smallPaint)
            }
        }
        // smooth curve through the column centers
        val path = Path()
        points.forEachIndexed { index, (x, y) ->
            if (index == 0) {
                path.moveTo(0f, y)
                path.lineTo(x, y)
            } else {
                val (previousX, previousY) = points[index - 1]
                val middleX = (previousX + x) / 2
                path.cubicTo(middleX, previousY, middleX, y, x, y)
            }
        }
        path.lineTo(widthPx.toFloat(), points.last().second)
        val curvePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 3 * density
            strokeCap = Paint.Cap.ROUND
            this.color = CURVE_COLOR
        }
        canvas.drawPath(path, curvePaint)
        shown.forEachIndexed { index, hour ->
            canvas.drawText(hour.temperature, points[index].first, points[index].second - 6 * density, textPaint)
        }
        Image(
            provider = ImageProvider(bitmap),
            contentDescription = null,
            contentScale = ContentScale.FillBounds,
            modifier = modifier.fillMaxWidth().height(height)
        )
    }
}
