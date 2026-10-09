// Modern style building blocks of the widgets (the "chips" and "hourlyChart" layout elements)

import SwiftUI
import WidgetKit

// hex colors from the app: #rrggbb or #rrggbbaa
private func colorFromHex(_ hex: String, fallback: Color) -> Color {
    var value = hex.trimmingCharacters(in: .whitespaces)
    if value.hasPrefix("#") { value.removeFirst() }
    guard value.count == 6 || value.count == 8, let number = UInt64(value, radix: 16) else { return fallback }
    let hasAlpha = value.count == 8
    let red = Double((number >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
    let green = Double((number >> (hasAlpha ? 16 : 8)) & 0xFF) / 255
    let blue = Double((number >> (hasAlpha ? 8 : 0)) & 0xFF) / 255
    let alpha = hasAlpha ? Double(number & 0xFF) / 255 : 1
    return Color(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
}

private let barWidth: CGFloat = 24
private let curveColor = Color(.sRGB, red: 0xEF / 255, green: 0x9F / 255, blue: 0x27 / 255, opacity: 1)
private let precipFallback = Color(.sRGB, red: 0x37 / 255, green: 0x8A / 255, blue: 0xDD / 255, opacity: 1)

private let chipPadding: CGFloat = 7
private let chipIconGap: CGFloat = 3

// widgets have no flow layout: chips fill rows in order while they fit (packChips in app/utils/widgetChips.ts)
private func packChips(_ widths: [CGFloat], maxWidth: CGFloat, spacing: CGFloat, maxRows: Int) -> [[Int]] {
    var rows: [[Int]] = []
    var rowWidth: CGFloat = 0
    for (index, width) in widths.enumerated() {
        if !rows.isEmpty && rowWidth + spacing + width <= maxWidth {
            rows[rows.count - 1].append(index)
            rowWidth += spacing + width
        } else if rows.count < maxRows && width <= maxWidth {
            rows.append([index])
            rowWidth = width
        } else {
            break
        }
    }
    return rows
}

@available(iOS 14.0, *)
struct WidgetChipView: View {
    let chip: WidgetChip
    let color: Color
    let fontSize: CGFloat
    let iconSize: CGFloat

    // chip width: padding, icon, gap, value and unit (same estimate in WidgetModern.kt)
    static func width(_ chip: WidgetChip, fontSize: CGFloat, iconSize: CGFloat) -> CGFloat {
        let value = (chip.value as NSString).size(withAttributes: [.font: UIFont.systemFont(ofSize: fontSize, weight: .medium)]).width
        let unit = chip.unit.isEmpty ? 0 : ((" " + chip.unit) as NSString).size(withAttributes: [.font: UIFont.systemFont(ofSize: fontSize * 0.8)]).width
        return 2 * chipPadding + iconSize + chipIconGap + value + unit
    }

    private var background: Color {
        chip.tint.isEmpty ? color.opacity(0.06) : colorFromHex(chip.tint, fallback: .clear)
    }

    var body: some View {
        HStack(spacing: chipIconGap) {
            WeatherIconView(chip.iconPath, size: iconSize)
            VStack(alignment: .leading, spacing: 1) {
                HStack(alignment: .lastTextBaseline, spacing: 0) {
                    Text(chip.value).font(.system(size: fontSize, weight: .medium)).foregroundColor(color).lineLimit(1)
                    if !chip.unit.isEmpty {
                        Text(" " + chip.unit).font(.system(size: fontSize * 0.8)).foregroundColor(color.opacity(0.6)).lineLimit(1)
                    }
                }
                if chip.barFraction > 0 {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(colorFromHex(chip.barColor, fallback: precipFallback))
                        .frame(width: max(3, barWidth * CGFloat(chip.barFraction)), height: 2)
                }
            }
        }
        .padding(.horizontal, chipPadding)
        .padding(.vertical, 2)
        .background(Capsule().fill(background))
    }
}

// weather data chips like the app: soft pills sized to their content, wrapping on up to maxRows rows
// of maxWidth. Chips that do not fit are not shown
@available(iOS 14.0, *)
struct WidgetChipsView: View {
    let chips: [WidgetChip]
    var color: Color = WidgetColorProvider.onSurface
    var fontSize: CGFloat = 12
    var iconSize: CGFloat = 14
    var spacing: CGFloat = 4
    var limit: Int = 4
    var maxWidth: CGFloat = .greatestFiniteMagnitude
    var maxRows: Int = 1

    var body: some View {
        let shown = Array(chips.prefix(limit))
        let rows = packChips(shown.map { WidgetChipView.width($0, fontSize: fontSize, iconSize: iconSize) }, maxWidth: maxWidth, spacing: spacing, maxRows: maxRows)
        VStack(alignment: .leading, spacing: spacing) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: spacing) {
                    ForEach(row, id: \.self) { index in
                        WidgetChipView(chip: shown[index], color: color, fontSize: fontSize, iconSize: iconSize)
                    }
                }
            }
        }
    }
}

// the app hourly card chart: temperature curve with its values, precipitation bars with amount and probability
@available(iOS 14.0, *)
struct WidgetHourlyChartView: View {
    let hours: [HourlyData]
    var limit: Int = 6
    var color: Color = WidgetColorProvider.onSurface
    var fontSize: CGFloat = 13

    private var shown: [HourlyData] { Array(hours.prefix(limit)) }

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            let count = max(shown.count, 1)
            let columnWidth = width / CGFloat(count)
            let curveTop = fontSize * 1.4
            // curve band above the precipitation bars (at most half of the height)
            let curveBottom = height * 0.5
            let smallSize = fontSize * 0.85
            let points = shown.enumerated().map { index, hour in
                CGPoint(x: columnWidth * (CGFloat(index) + 0.5), y: curveBottom - CGFloat(hour.curve) * (curveBottom - curveTop))
            }
            ZStack(alignment: .topLeading) {
                // precipitation like the app hourly item: rounded bars from the bottom, the amount at the
                // bottom and the probability above it, over the bars
                ForEach(Array(shown.enumerated()), id: \.offset) { index, hour in
                    let left = columnWidth * CGFloat(index)
                    ForEach(Array(hour.precipBars.enumerated()), id: \.offset) { _, bar in
                        let top = CGFloat(bar.top) * (height - 10)
                        let bottom = height - 3
                        let barWidth = columnWidth * CGFloat(bar.end - bar.start) - 6
                        RoundedRectangle(cornerRadius: min(4, (bottom - top) / 2))
                            .fill(colorFromHex(bar.color, fallback: precipFallback))
                            .frame(width: barWidth, height: bottom - top)
                            .position(x: left + columnWidth * CGFloat(bar.start) + 3 + barWidth / 2, y: (top + bottom) / 2)
                    }
                    if !hour.precipAmount.isEmpty {
                        Text(hour.precipAmount).font(.system(size: smallSize, weight: .medium)).foregroundColor(color)
                            .position(x: points[index].x, y: height - 6 - smallSize * 0.35)
                    }
                    if !hour.precipProbability.isEmpty {
                        Text(hour.precipProbability).font(.system(size: smallSize)).foregroundColor(color.opacity(0.6))
                            .position(x: points[index].x, y: height - (hour.precipAmount.isEmpty ? 6 : 19) - smallSize * 0.35)
                    }
                }
                Path { path in
                    guard let first = points.first, let last = points.last else { return }
                    path.move(to: CGPoint(x: 0, y: first.y))
                    path.addLine(to: first)
                    for index in points.indices.dropFirst() {
                        let previous = points[index - 1]
                        let point = points[index]
                        let middleX = (previous.x + point.x) / 2
                        path.addCurve(to: point, control1: CGPoint(x: middleX, y: previous.y), control2: CGPoint(x: middleX, y: point.y))
                    }
                    path.addLine(to: CGPoint(x: width, y: last.y))
                }
                .stroke(curveColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                ForEach(Array(shown.enumerated()), id: \.offset) { index, hour in
                    Text(hour.temperature).font(.system(size: fontSize, weight: .medium)).foregroundColor(color)
                        .position(x: points[index].x, y: points[index].y - fontSize * 0.75)
                }
            }
        }
    }
}
