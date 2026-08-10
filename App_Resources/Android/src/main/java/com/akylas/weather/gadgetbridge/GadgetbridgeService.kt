package com.akylas.weather.gadgetbridge

import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONArray
import java.io.ByteArrayOutputStream
import java.util.zip.GZIPOutputStream
import kotlin.concurrent.thread

/**
 * Gadgetbridge Service for broadcasting weather data to smartwatches
 * The WeatherSpec payload is built in JS (see app/services/gadgetbridgePayload.ts), this only
 * compresses it and broadcasts it to every known Gadgetbridge variant
 */
class GadgetbridgeService {
    companion object {
        private const val TAG = "GadgetbridgeService"
        private const val ACTION = "nodomain.freeyourgadget.gadgetbridge.ACTION_GENERIC_WEATHER"

        // https://gadgetbridge.org/internals/development/weather-support/
        private val PACKAGES = listOf(
            "nodomain.freeyourgadget.gadgetbridge",
            "nodomain.freeyourgadget.gadgetbridge.nightly",
            "nodomain.freeyourgadget.gadgetbridge.nightly_nopebble",
            "com.espruino.gadgetbridge.banglejs",
            "com.espruino.gadgetbridge.banglejs.nightly"
        )

        /**
         * Broadcast weather data to Gadgetbridge on a background thread
         * @param context Android context
         * @param weatherSpecsJson JSON array of WeatherSpec objects
         */
        @JvmStatic
        fun broadcastWeather(context: Context, weatherSpecsJson: String) {
            // Run on background thread to avoid blocking main thread
            thread {
                try {
                    val weatherSpecs = JSONArray(weatherSpecsJson)
                    if (weatherSpecs.length() == 0) {
                        return@thread
                    }

                    // current format: the whole array, gzipped
                    val weatherGz = gzipCompress(weatherSpecs.toString())
                    // deprecated format, kept for older Gadgetbridge versions: the first location only
                    val weatherJson = weatherSpecs.getJSONObject(0).toString()

                    PACKAGES.forEach { pkg ->
                        val intent = Intent(ACTION).apply {
                            setPackage(pkg)
                            // Gadgetbridge may be in the stopped state, it would not be woken up otherwise
                            addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES)
                            putExtra("WeatherGz", weatherGz)
                            putExtra("WeatherJson", weatherJson)
                        }
                        context.sendBroadcast(intent)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to broadcast weather to Gadgetbridge", e)
                }
            }
        }

        /**
         * Compress string data using GZIP
         */
        private fun gzipCompress(data: String): ByteArray {
            val outputStream = ByteArrayOutputStream()
            val gzipStream = GZIPOutputStream(outputStream)
            gzipStream.write(data.toByteArray(Charsets.UTF_8))
            gzipStream.close()
            return outputStream.toByteArray()
        }
    }
}
