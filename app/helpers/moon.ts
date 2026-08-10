import { getMoonIllumination } from 'suncalc';

/**
 * Moon phase as the app icon index: 0..28.
 */
export function getMoonPhase(date: Date) {
    const illumination = getMoonIllumination(date);
    return Math.round(illumination.phase * 28);
}

/**
 * Moon phase in degrees [0, 360[, the unit Gadgetbridge's WeatherSpec expects.
 */
export function getMoonPhaseDegrees(date: Date) {
    const illumination = getMoonIllumination(date);
    return Math.round(illumination.phase * 360) % 360;
}
