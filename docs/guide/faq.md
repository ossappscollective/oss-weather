# Frequently Asked Questions

## General

### What is OSS Weather?

A free, open-source weather app for Android and iOS (and Mac). It shows forecasts from Open-Meteo, Meteo France, OpenWeather and AccuWeather, with charts, a weather map, widgets and more.

### Is it really free?

Yes. No ads, no paid features. The code is under the MIT License. You can [support the developer](https://github.com/sponsors/farfromrefug) if you like the app.

### Which devices are supported?

- Android 7.0 (API 24) or later
- iOS 13.0 or later (iOS 18 or later for home screen widgets)
- macOS 12 or later (Mac Catalyst build)

See [Installation](/guide/installation).

## Weather data

### Which provider should I use?

Start with **Open-Meteo**, the default: no key needed, and you can choose among many weather models. Try **Meteo France** in France. OpenWeather and AccuWeather need your own API key. See [Weather providers](/guide/weather-providers).

### Why do providers show different forecasts?

They use different weather models and data. Use **Compare models** in the overflow menu (⋮) to see them side by side for your location.

### Can I use a different provider for one location?

Yes. In the favorites drawer, tap the ⋮ on the location and pick **Provider**. You can also set its Open-Meteo model, air quality provider and marine provider there.

### How often is the data updated?

When you open the app, when you come back to it with outdated data, and when you pull down to refresh. Widgets update on their own, every 15 minutes to 24 hours (Settings > Widget settings, Android).

### Does it show weather alerts?

Yes, when the provider sends them: Meteo France warnings, OpenWeather alerts, and AccuWeather alerts on paid AccuWeather plans. Open-Meteo has no alerts. An alert icon appears in the action bar when there are alerts.

### How many days of forecast can I see?

Up to 16 days, set in Settings > Providers > Days in forecast (default 7). Each provider returns at most what it offers.

## API keys

### Do I need an API key?

- **No**: Open-Meteo, Meteo France, and the default weather map source (LibreWXR).
- **Yes, your own**: OpenWeather, AccuWeather, and the MapTiler map source.

The app does not include an OpenWeather key. See [API keys](/guide/api-keys).

### My OpenWeather key does not work

Check the key has no extra spaces and is active on the OpenWeather website. Then try the other **OneCall version** (2.5 or 3.0) in Settings > Providers > OpenWeather.

## Features

### Can I use the app offline?

The last fetched data stays available. If it is too old to cover the coming hours, the app says the data is outdated and offers a refresh.

### Can I compare places?

Compare models compares providers and models for one location, not different places. To check several places, save them as favorites and switch between them in the drawer.

### Can I change how the app looks?

Yes, in Settings > Appearance: theme (Auto, Light, Dark, Black), color theme (Default, E-Ink, Dynamic colors on Android 12+), font scale, modern or classic design style, and the layout of weather data (aligned grid, chips or blocks). Icon packs are in Settings > Icons.

### Does it work with my smartwatch?

On Android, turn on Settings > Integrations > Enable Gadgetbridge support. See [Smartwatch](/features/smartwatch).

### Can I back up my settings?

Yes. Settings > Backup & restore > Export settings saves a JSON file. Import settings restores it.

## Privacy

### Does OSS Weather track me?

No. There are no analytics. Your location is only sent to the weather providers you use, to get forecasts.

### What about crash reports?

Store builds have an **enable crash reports** option in Settings > Debugging. Reports go to a private Sentry instance and are only used for debugging. You can turn it off.

### Which permissions does it use?

Location (only while you use the app) and internet access. See [Installation](/guide/installation#permissions).

## Widgets

### Why isn't my widget updating?

- Check the update frequency in Settings > Widget settings.
- Use **Update All Widgets Now** in the same screen.
- Make sure battery optimization does not block the app.
- If the widget uses "My location", make sure location permission is granted.

### Can I have several widgets?

Yes. Each widget has its own location, provider and options. See [Home widgets](/features/home-widgets).

## Weather map

### The map shows nothing

Check your connection. The default source is LibreWXR. If you switched to MapTiler, it needs a MapTiler API key. Change the source in Settings > Radar.

## Contributing

### How can I help?

- Report bugs and request features on [GitHub](https://github.com/ossappscollective/oss-weather/issues)
- Chat and ask questions on [Discord](https://discord.gg/28T5vKsbp4)
- Translate on [Weblate](https://hosted.weblate.org/engage/oss-weather/)
- Contribute code on [GitHub](https://github.com/ossappscollective/oss-weather)
- [Support the developer](https://github.com/sponsors/farfromrefug)

### I found a bug, what should I include?

Your device and OS version, the app version, the provider you use, the steps to reproduce, and screenshots if possible.
