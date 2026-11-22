# Weather Map

An interactive map showing weather layers around a location, and a map to pick a new location.

<img class="ow-shot" src="/screenshots/5_en-US.png" alt="Weather map">

## The map screen

Open it from the main screen menu (top right) with **Map**, or from the menu of a saved location in the favorites drawer. The map opens centered on that location, with a marker on it.

- Pinch to zoom and drag to move. Rotation is disabled.
- The base map is an OpenStreetMap vector map, drawn with [MapLibre](https://maplibre.org). It follows the app's light or dark theme.
- Map labels use the app language when available.

## Weather layers

The map shows one weather layer at a time, with an animation timeline at the bottom:

- **LibreWXR** (default, no API key): radar, satellite, or radar + satellite
- **MapTiler** (needs your own API key): radar, precipitation, wind, temperature or pressure

Choose the source in Settings > Radar. See [Weather radar](/features/weather-radar) for layers, color schemes and animation options.

## Select a location on the map

To add a location by pointing at it:

1. On the main screen, open the menu (top right) and tap **Select location on map**.
2. Tap the map where you want the weather. A marker appears.
3. Tap **Select a location** to confirm.

The weather for that point opens on the main screen. Tap the star in the top bar to save it as a favorite.

This map is also used to choose the location of a home screen widget.

## Custom tile server

Settings > Radar > **custom tile server** lets you use your own vector tile server for the base map. If it cannot be reached, the default map is used.

## Next steps

- [Weather radar](/features/weather-radar)
- [Basic usage](/guide/basic-usage)
- [Compare models](/features/weather-comparison)
