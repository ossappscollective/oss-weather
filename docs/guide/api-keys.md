# API Keys

Most of OSS Weather works without any API key. You only need your own key for some providers.

## Which providers need a key

| Service | Key needed | What for |
|---------|-----------|----------|
| Open-Meteo | No | Forecasts (default provider), air quality |
| Meteo France | No (built-in key, your own is optional) | Forecasts, warnings, avalanche bulletins |
| OpenWeather | **Yes, your own** | Forecasts |
| AccuWeather | **Yes, your own** | Forecasts, air quality |
| MapTiler | **Yes, your own**, only if you choose MapTiler as map source | Weather map |
| LibreWXR | No | Weather map (default source) |

The app does not ship an OpenWeather or AccuWeather key. Each user has to create their own on the provider's website. Plans and limits are set by each provider: check their website.

## Where to enter a key

Provider keys are in **Settings > Providers**. Each provider with options has its own section at the bottom of that page:

- **OpenWeather**: "OpenWeather API key"
- **AccuWeather**: "API key"
- **Meteo France**: "API key"

The MapTiler key is in **Settings > Radar**, under **MapTiler**.

The app also asks for a key in a few cases:

- you refresh with AccuWeather selected and no key set
- AccuWeather rejects the key (it is then cleared)
- you open the weather map with the MapTiler source and no MapTiler key

The prompt has a button that opens the provider's website.

## OpenWeather

1. Create an account on [OpenWeather](https://openweathermap.org/).
2. Copy your API key from your account page.
3. In OSS Weather, go to **Settings > Providers**, then **OpenWeather API key**, and paste it.

The app uses OpenWeather's **One Call** API. The **OneCall version** setting (same section) picks version **3.0** (default) or **2.5**. Check on OpenWeather which version your key can use. New keys may take a while to become active.

## AccuWeather

1. Create an account on the [AccuWeather developer portal](https://developer.accuweather.com/).
2. Create an app to get an API key.
3. In OSS Weather, go to **Settings > Providers**, then **API key** in the AccuWeather section, and paste it.

AccuWeather weather alerts are only returned on paid AccuWeather plans. Without one, forecasts still work.

## Meteo France

Meteo France works out of the box with a key built into the app. The **API key** field lets you use your own key instead. The same key is used to download the avalanche bulletins (BRA).

## MapTiler

Only needed if you set **Settings > Radar > Weather map source** to **MapTiler**. Create a free account on [MapTiler](https://www.maptiler.com/), then paste the key in **Settings > Radar > MapTiler API key**, or in the prompt that appears when you open the map.

The default map source, LibreWXR, needs no key.

## Troubleshooting

- **The key is refused**: check for extra spaces and that the key is active on the provider's website, then enter it again.
- **No data with OpenWeather**: try the other **OneCall version**.
- **You don't want to manage keys**: use Open-Meteo or Meteo France.

## Next steps

- [Weather providers](/guide/weather-providers)
- [Settings](/guide/settings)
