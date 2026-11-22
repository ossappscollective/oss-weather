# Weather Radar

Animated precipitation radar and satellite images on the weather map, from [LibreWXR](https://librewxr.net) by default.

<img class="ow-shot" src="/features/weather-map.webp" alt="Radar on the weather map">

## Opening the radar

On the main screen, tap the menu button (top right), then **Map**. The map opens centered on the selected location. You can also open it for any saved location from its menu in the favorites drawer.

## Layers

With LibreWXR (the default source, no API key needed) you can show:

- **Radar**: precipitation
- **Satellite**: satellite imagery
- **Radar + satellite**: both at once

A **show snow** option controls whether snow is drawn on the radar.

In the modern style, the current layer is shown in a chip at the top left. Tap it, or the layers button, to switch layer. In the classic style the same buttons are in the top bar.

## Color schemes

Tap the palette button to choose how radar intensity is colored. LibreWXR offers 15 schemes, for example Universal Blue, The Weather Channel, NEXRAD Level III, Rainbow, Dark Sky and Windy.

## Animation

At the bottom of the map:

- **Play / pause** button to animate the frames
- **Slider** to move to a given time
- **Time label** showing the time of the selected frame

Frames include past radar images and the short-term forecast ("nowcast") when the server provides it.

The options button (tune icon) lets you change, without leaving the map:

- Animation speed
- Layer opacity
- Show snow (LibreWXR)

## Radar widget

A radar picture on the main screen, between the current weather and the hourly forecast, so you can check the rain without opening the map. Tapping it opens the full map.

By default it is collapsed: tap the radar button next to the last update time to show it, tap it again to hide it. No vertical space is used while it is collapsed, and nothing is loaded. Your choice is remembered.

Settings > Radar > **Radar widget**:

- **Layout**: **collapsible** (the button above), **banner** (always open) or **off**.
- **Show**: **always**, or only **when rain is forecast** in the next 2 hours.
- **Size**: small, medium or large.
- **Background**: none (dark grid and crosshair on your location), or an OpenStreetMap map under the radar.
- **Autoloop**: loops the frames while the widget is on screen. Nothing is loaded or animated when it is scrolled out of view, the app is in the background or you are offline.
- **Past window** and **forecast window**: how many minutes of past and forecast frames are looped. Set the past window to 0 to only see the forecast.
- **Frame duration** and **fade between frames**: the speed and the look of the loop.
- **Background color** and **grid color**: tap to pick a color, long press to go back to the default (the app section color, and a light blue).
- **Radar opacity**: how transparent the radar frames are over the background.
- **Smooth**: smoothing of the radar image.

The chip shows `NOW` for the latest radar observation, and `-N min` or `+N min` for the other frames, relative to it. Radar frames are 10 minutes apart. The widget also uses the LibreWXR server, color scheme and show snow options, and is only available with the LibreWXR source.

## Radar settings

Settings > Radar has a **Weather map** section and a **Radar widget** section. The weather map options are:

- **Weather map source**: LibreWXR or MapTiler
- Animation speed and layer opacity
- Max time span (in hours) and **show past data**
- Custom tile server for the base map
- **LibreWXR**: server address, color scheme, default layer, show snow
- **MapTiler**: API key, color scheme, default layer

### MapTiler

MapTiler is an alternative source that needs your own [MapTiler](https://www.maptiler.com/weather/) API key. Its layers are radar, precipitation, wind, temperature and pressure.

## Map controls

- Pinch to zoom, drag to move. Rotation is disabled.
- The base map follows the app's light or dark theme.

## Next steps

- [Weather map](/features/weather-map)
- [Hourly charts](/features/hourly-charts)
- [Daily forecasts](/features/daily-forecasts)
