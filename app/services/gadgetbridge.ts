import { ApplicationSettings, Utils } from '@nativescript/core';
import { lc } from '@nativescript-community/l';
import { showError } from '@shared/utils/showError';
import { WeatherLocation } from './api';
import { buildGadgetbridgePayload } from './gadgetbridgePayload';
import { WeatherData } from './providers/weather';

const GADGETBRIDGE_ENABLED_KEY = 'gadgetbridge_enabled';

/**
 * Gadgetbridge Service for broadcasting weather data to smartwatches
 * The payload is built in `gadgetbridgePayload`; the native Kotlin side only gzips and broadcasts it
 */
class GadgetbridgeService {
    private enabled = false;
    private failureReported = false;

    constructor() {
        this.enabled = ApplicationSettings.getBoolean(GADGETBRIDGE_ENABLED_KEY, false);
    }

    /**
     * Enable or disable Gadgetbridge weather broadcasts
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.failureReported = false;
        ApplicationSettings.setBoolean(GADGETBRIDGE_ENABLED_KEY, enabled);
    }

    /**
     * Check if Gadgetbridge is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Broadcast weather data to Gadgetbridge via native Kotlin implementation
     */
    broadcastWeather(location: WeatherLocation, weatherData: WeatherData) {
        if (!this.enabled || !__ANDROID__) {
            return;
        }

        try {
            const context = Utils.android.getApplicationContext();
            const weatherSpecsJson = JSON.stringify(buildGadgetbridgePayload(location, weatherData));
            DEV_LOG && console.log('[Gadgetbridge] weatherSpecsJson', weatherSpecsJson);

            // Call native Kotlin method to handle broadcasting on background thread
            const GadgetbridgeServiceClass = com.akylas.weather.gadgetbridge.GadgetbridgeService;
            GadgetbridgeServiceClass.broadcastWeather(context, weatherSpecsJson);

            DEV_LOG && console.log('[Gadgetbridge] Weather data sent to native service for broadcasting', Date.now());
        } catch (error) {
            // release builds strip console.*, so tell the user once instead of failing silently
            if (!this.failureReported) {
                this.failureReported = true;
                showError(error, { forcedMessage: lc('gadgetbridge_broadcast_failed'), showAsSnack: true });
            }
        }
    }
}

export const gadgetbridgeService = new GadgetbridgeService();
