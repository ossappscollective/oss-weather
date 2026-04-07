// App_Resources/iOS/WidgetExtension/WeatherTimelineProvider.swift
// Timeline provider for all weather widgets

import WidgetKit
import SwiftUI

@available(iOS 14.0, *)
struct WeatherEntry: TimelineEntry {
    let date: Date
    let data: WeatherWidgetData?
    let widgetFamily: WidgetFamily
    let widgetKind: String
}

@available(iOS 14.0, *)
struct WeatherTimelineProvider: TimelineProvider {
    let widgetKind: String
    func placeholder(in context: Context) -> WeatherEntry {
        WeatherEntry(
            date: Date(),
            data: nil,
            widgetFamily: context.family,
            widgetKind: widgetKind
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) {
        let widgetId = getWidgetId(from: context)
        let data = WidgetDataProvider.loadWidgetData(widgetId: widgetId)
        
        let entry = WeatherEntry(
            date: Date(),
            data: data,
            widgetFamily: context.family,
            widgetKind: widgetKind
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        let widgetId = getWidgetId(from: context)
        
        // Check if this is first time seeing this widget
        let activeWidgets = WidgetLifecycleManager.shared.getActiveWidgets()
        if activeWidgets[widgetId] == nil {
            // New widget detected
            WidgetLifecycleManager.shared.notifyWidgetAdded(widgetId: widgetId, widgetKind: widgetKind)
        }
        
        let currentDate = Date()
        let weatherData = WidgetDataProvider.loadWidgetData(widgetId: widgetId)
        
        // Determine refresh policy based on widget type
        let isClockWidget = widgetKind.contains("Clock")
        let isDateWidget = widgetKind.contains("Date")
        
        var entries: [WeatherEntry] = []
        let nextUpdate: Date
        
        // if isClockWidget {
        //     // Clock widgets: Update every minute for the next hour
        //     for minuteOffset in 0..<60 {
        //         let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
        //         entries.append(WeatherEntry(
        //             date: entryDate,
        //             data: weatherData,
        //             widgetFamily: context.family,
        //             widgetKind: widgetKind
        //         ))
        //     }
        //     nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate)!
            
        // } else if isDateWidget {
        //     // Date widgets: Update at midnight
        //     let calendar = Calendar.current
        //     entries.append(WeatherEntry(
        //         date: currentDate,
        //         data: weatherData,
        //         widgetFamily: context.family,
        //         widgetKind: widgetKind
        //     ))
            
        //     var components = calendar.dateComponents([.year, .month, .day], from: currentDate)
        //     components.day! += 1
        //     components.hour = 0
        //     components.minute = 0
        //     nextUpdate = calendar.date(from: components)!
            
        // } else {
            // Weather-only widgets: Use configured frequency
            let updateFrequency = WidgetSettings.shared.getUpdateFrequency()
            // let numberOfEntries = min(12, 360 / updateFrequency)
            
            // for offset in 0..<numberOfEntries {
            //     let entryDate = Calendar.current.date(byAdding: .minute, value: offset * updateFrequency, to: currentDate)!
            //     entries.append(WeatherEntry(
            //         date: entryDate,
            //         data: weatherData,
            //         widgetFamily: context.family,
            //         widgetKind: widgetKind
            //     ))
            // }
            
            // let reloadMinutes = min(updateFrequency * numberOfEntries, 120)
            nextUpdate = Calendar.current.date(byAdding: .minute, value: updateFrequency, to: currentDate)!
        // }
        
        let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getWidgetId(from context: Context) -> String {
        // Generate consistent widget ID from context
        // In iOS, we use the widget's configuration display name or a hash
        return "widget_\(context.family.rawValue)_\(widgetKind)".hash.description
    }
}
