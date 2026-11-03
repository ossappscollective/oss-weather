import type { WeatherLocation } from '~/services/api';

const BRA_BOUNDS = [-4.855957, 41.310824, 9.645996, 51.124213];

/** mountain avalanche bulletins (BRA) exist for the French territory only */
export function isBRALocation(location: Pick<WeatherLocation, 'coord' | 'timezone'>) {
    const { lat, lon } = location.coord;
    return location.timezone === 'Europe/Paris' && lon >= BRA_BOUNDS[0] && lon <= BRA_BOUNDS[2] && lat >= BRA_BOUNDS[1] && lat <= BRA_BOUNDS[3];
}
