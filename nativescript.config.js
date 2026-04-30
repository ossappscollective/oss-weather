const timelineEnabled = !!process.env['NS_TIMELINE'];
const sentryEnabled = !!process.env['NS_SENTRY'];
const loggingEnabled = !!process.env['NS_LOGGING'];
const playstoreBuild = !!process.env['PLAY_STORE_BUILD'];

module.exports = {
    ignoredNativeDependencies: [].concat(sentryEnabled ? [] : ['@nativescript-community/sentry']).concat(playstoreBuild ? [] : ['@akylas/nativescript-inapp-purchase']),
    id: process.env['APP_ID'],
    appResourcesPath: 'App_Resources',
    buildPath: 'platforms',
    webpackPackageName: '@akylas/nativescript-webpack',
    webpackConfigPath: 'app.webpack.config.js',
    appPath: 'app',
    forceLog: loggingEnabled,
    profiling: timelineEnabled ? 'timeline' : undefined,
    i18n: {
        defaultLanguage: 'en'
    },
    ios: {
        runtimePackageName: '@akylas/nativescript-ios-runtime',
        ignoredNativeDependencies: ['plugin-widgets'],
        // SPMPackages: [
        //     {
        //         name: 'IQKeyboardManagerSwift',
        //         libs: ['IQKeyboardManagerSwift'],
        //         repositoryURL: 'https://github.com/hackiftekhar/IQKeyboardManager.git',
        //         version: '8.0.2'
        //     }
        // ]
    },
    android: {
        runtimePackageName: '@akylas/nativescript-android-runtime',
        gradleVersion: '8.14.3',
        markingMode: 'none',
        codeCache: true,
        enableMultithreadedJavascript: false,
        handleTimeZoneChanges: true,
        ...(loggingEnabled
            ? {
                  forceLog: true,
                  maxLogcatObjectSize: 40096
              }
            : {})
    },
    cssParser: 'rework',
    hooks: [
        {
            type: 'after-prepareNativeApp',
            script: 'tools/scripts/after-prepareNativeApp.js'
        }
    ]
};
