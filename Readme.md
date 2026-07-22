<img title="" src="fastlane/metadata/android/en-US/images/featureGraphic.png">

<div align="center">

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](COC.md)
[![GitHub repo stars](https://img.shields.io/github/stars/ossappscollective/oss-weather?style=flat)](https://github.com/ossappscollective/oss-weather/stargazers)
[![GitHub License](https://img.shields.io/github/license/ossappscollective/oss-weather)](https://github.com/ossappscollective/oss-weather/blob/master/COPYING)
[![GitHub All Releases](https://img.shields.io/github/downloads/ossappscollective/oss-weather/total.svg)](https://github.com/ossappscollective/oss-weather/releases/)
[![GitHub release](https://img.shields.io/github/v/release/ossappscollective/oss-weather?display_name=release)](https://github.com/ossappscollective/oss-weather/releases/latest)
[![Small translation badge](https://hosted.weblate.org/widgets/oss-weather/-/svg-badge.svg)](https://hosted.weblate.org/engage/oss-weather/?utm_source=widget)

</div>

<!-- <h1 align="center">Scan all your documents</h1>
<p align="center">
  <a href="https://github.com/ossappscollective/oss-weather" alt="License"><img src="https://img.shields.io/badge/License-MIT-blue.svg"/></a>
 <a href="https://github.com/ossappscollective/oss-weather/releases" alt="Release version"><img src="https://img.shields.io/github/downloads/akylas/oss-weather/total"/></a> -->

 ## Installation

<div align="center">

|  ||
|:-:|:-:|
|[<img src="https://gitlab.com/IzzyOnDroid/repo/-/raw/master/assets/IzzyOnDroidButtonGreyBorder_nofont.png" height="50" alt="Get OSS Weather at IzzyOnDroid">](https://apt.izzysoft.de/fdroid/index/apk/com.akylas.weather)|[<img src="https://raw.githubusercontent.com/pioug/google-play-badges/refs/heads/main/svg/en.svg" alt="Get it on PlayStore" style="height:50px">](https://play.google.com/store/apps/details?id=com.akylas.weather)|
|[<img src="https://raw.githubusercontent.com/Akylas/OSS-DocumentScanner/main/graphics/badge_github.png" alt="Get it on GitHub" style="height:50px">](https://github.com/ossappscollective/oss-weather/releases)|<div><a href="https://apps.apple.com/fr/app/oss-weather/id1499117252"><img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1496188800" alt="Download on the App Store" style="height:58px"></a></div>|
</div>
 
#### AppVerifier hashes 

**OSS Weather**: 

```
com.akylas.weather
68:70:80:D4:CF:6F:CF:FE:8D:82:FD:1D:78:3C:90:C2:95:94:80:AA:13:C3:8A:D8:D0:4E:C3:40:66:FC:13:F1
```

<h2 align="center">Enjoying OSS Weather?</h2>

<p align="center">Please consider making a small donation to help fund the project. Developing an application, especially one that is open source and completely free, takes a lot of time and effort.
<br>
<br>
<div align="center">
<a href="https://github.com/sponsors/farfromrefug">:heart: Sponsor</a>
</div>
<hr>

Open Source app to access detailed weather data from OpenWeather, Open-Meteo and Meteo France. Weather radar provided by RainViewer.
You can create a free OWM key to access OpenWeather weather data.
There is a default key included in the app but the access is limited and you could get errors related to rate limits.

## Screenshots

<p align="left">
    <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/1_en-US.png" width=30%/>
    <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/2_en-US.png" width=30%/>
    <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/3_en-US.png" width=30%/>
</p>

<p align="left">
    <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/4_en-US.png" width=30%/>
    <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/5_en-US.png" width=30%/>
    <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/6_en-US.png" width=30%/>
</p>

### Having issues, suggestions and feedback?

You can,
- [Create an issue here](https://github.com/farfromrefug/oss-weather/issues)

### Languages: [<img align="right" src="https://hosted.weblate.org/widgets/oss-weather/-/287x66-white.png" alt="Übersetzungsstatus" />](https://hosted.weblate.org/engage/oss-weather/?utm_source=widget)

[<img src="https://hosted.weblate.org/widgets/oss-weather/-/multi-auto.svg" alt="Übersetzungsstatus" />](https://hosted.weblate.org/engage/oss-weather/)

The Translations are hosted by [Weblate.org](https://hosted.weblate.org/engage/oss-weather/).

<p align="center">
  <a href="https://raw.githubusercontent.com/farfromrefug/sponsorkit/main/sponsors.svg">
	<img src='https://raw.githubusercontent.com/farfromrefug/sponsorkit/main/sponsors.svg'/>
  </a>
</p>

Feature Graphic generated with [hotpot.ai](https://hotpot.ai/design/google-play-feature-graphic)

## Building Setup

### Nativescript

First [setup Nativescript](https://docs.nativescript.org/setup/linux)

This project is optimized to be built with [Akylas Fork](https://github.com/Akylas/NativeScript). Though it would work with main it is best to use this fork. The `package.json` defines a resolution to `../NativeScript/dist/packages/core` so clone the fork and build it using `npm run setup:yarn && npm run ui-mobile-base:build && npm run core:build`

### Yarn

You need to use yarn with this project as it uses the `portal:` protocol for some dependencies.
Note that the project has some `yarn link` for easy local dev for me. The best is for you to remove the `resolutions` part of the `package.json`
This should run the app on the first discovered device or emulator.
