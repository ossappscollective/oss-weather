import { describe, expect, it } from 'vitest';
import {
    cardBackgroundAlpha,
    dataTextStyle,
    dataTint,
    headerTextStyle,
    modernDataColor,
    modernLineStyle,
    precipKind,
    precipitationFill,
    splitTimePeriod,
    styledDataIcon,
    tintAlpha,
    windSpeedColor
} from './designStyle';

const theme = { onSurface: '#1e1b16', onSurfaceVariant: '#4d4639' };

describe('styledDataIcon', () => {
    it('swaps a classic glyph for its wd- twin in the modern style', () => {
        expect(styledDataIcon('modern', { fontFamily: 'wi', icon: 'wi-raindrop' })).toEqual({ fontFamily: 'wd', icon: 'wd-raindrop' });
        expect(styledDataIcon('modern', { fontFamily: 'mdi', icon: 'mdi-leaf' })).toEqual({ fontFamily: 'wd', icon: 'wd-leaf' });
        expect(styledDataIcon('modern', { fontFamily: 'app', icon: 'app-wind_3' })).toEqual({ fontFamily: 'wd', icon: 'wd-wind_3' });
    });
    it('swaps moon phases and beaufort levels too', () => {
        expect(styledDataIcon('modern', { fontFamily: 'wi', icon: 'wi-moon-full' })).toEqual({ fontFamily: 'wd', icon: 'wd-moon-full' });
        expect(styledDataIcon('modern', { fontFamily: 'wi', icon: 'wi-moon-waning-crescent-3' })).toEqual({ fontFamily: 'wd', icon: 'wd-moon-waning-crescent-3' });
        expect(styledDataIcon('modern', { fontFamily: 'wi', icon: 'wi-wind-beaufort-12' })).toEqual({ fontFamily: 'wd', icon: 'wd-wind-beaufort-12' });
    });
    it('has twins for min / max temperature, precipitation probability and snow depth', () => {
        expect(styledDataIcon('modern', { fontFamily: 'mdi', icon: 'mdi-thermometer-low' })).toEqual({ fontFamily: 'wd', icon: 'wd-thermometer-low' });
        expect(styledDataIcon('modern', { fontFamily: 'mdi', icon: 'mdi-thermometer-high' })).toEqual({ fontFamily: 'wd', icon: 'wd-thermometer-high' });
        expect(styledDataIcon('modern', { fontFamily: 'mdi', icon: 'mdi-umbrella-outline' })).toEqual({ fontFamily: 'wd', icon: 'wd-umbrella-outline' });
        expect(styledDataIcon('modern', { fontFamily: 'mdi', icon: 'mdi-snowflake' })).toEqual({ fontFamily: 'wd', icon: 'wd-snow-depth' });
        ['temperatureMin', 'temperatureMax', 'precipProbability', 'snowDepth'].forEach((key) => expect(modernDataColor(key)).toMatch(/^#[0-9A-F]{6}$/));
    });
    it('keeps glyphs that have no modern twin', () => {
        expect(styledDataIcon('modern', { fontFamily: 'wi', icon: 'wi-thermometer' })).toEqual({ fontFamily: 'wi', icon: 'wi-thermometer' });
    });
    it('leaves the classic style untouched', () => {
        expect(styledDataIcon('classic', { fontFamily: 'wi', icon: 'wi-raindrop' })).toEqual({ fontFamily: 'wi', icon: 'wi-raindrop' });
    });
    it('passes a missing icon through', () => {
        expect(styledDataIcon('modern', undefined)).toBeUndefined();
    });
});

describe('dataTextStyle', () => {
    it('colors the value like the data in the classic style', () => {
        expect(dataTextStyle('classic', { key: 'precipAccumulation', color: '#4681c3' }, theme, 1)).toEqual({
            iconColor: '#4681c3',
            valueColor: '#4681c3',
            subvalueColor: '#4681c3',
            valueFontSize: 12,
            subvalueFontSize: 9
        });
    });
    it('keeps the text neutral and only colors the icon in the modern style', () => {
        expect(dataTextStyle('modern', { key: 'precipAccumulation', color: '#4681c3' }, theme, 1)).toEqual({
            iconColor: '#4681c3',
            valueColor: theme.onSurface,
            subvalueColor: theme.onSurfaceVariant,
            valueFontSize: 13,
            subvalueFontSize: 11
        });
    });
    it('falls back to the modern palette when the data has no color', () => {
        expect(dataTextStyle('modern', { key: 'relativeHumidity' }, theme, 1).iconColor).toBe('#5DCAA5');
    });
    it('scales font sizes', () => {
        expect(dataTextStyle('modern', { key: 'windSpeed' }, theme, 2)).toMatchObject({ valueFontSize: 26, subvalueFontSize: 22 });
    });
});

describe('headerTextStyle', () => {
    it('keeps the classic header: date below the day, regular max temperature', () => {
        expect(headerTextStyle('classic', 1, '600')).toEqual({
            daySize: 22,
            dayWeight: 'normal',
            dateSize: 15,
            dateInline: false,
            minTempSize: 17,
            maxTempSize: 20,
            maxTempWeight: 'normal'
        });
    });
    it('puts the date next to the day and uses the accent weight in the modern style', () => {
        expect(headerTextStyle('modern', 2, '600')).toEqual({
            daySize: 36,
            dayWeight: '600',
            dateSize: 24,
            dateInline: true,
            minTempSize: 30,
            maxTempSize: 34,
            maxTempWeight: '600'
        });
    });
});

describe('precipitationFill', () => {
    it('keeps the classic color with an opacity following the probability', () => {
        expect(precipitationFill('classic', 'rain', '#4681C3', 100)).toEqual({ color: '#4681C3', alpha: 255 });
        expect(precipitationFill('classic', 'rain', '#4681C3', -1)).toEqual({ color: '#4681C3', alpha: 125 });
    });
    it('uses lighter modern colors capped below half opacity so text on top stays readable', () => {
        expect(precipitationFill('modern', 'rain', '#4681C3', 100)).toEqual({ color: '#378ADD', alpha: 115 });
        expect(precipitationFill('modern', 'snow', '#43b4e0', 50)).toEqual({ color: '#00CDE6', alpha: 58 });
        expect(precipitationFill('modern', 'rain', '#4681C3', -1)).toEqual({ color: '#378ADD', alpha: 58 });
    });
    it('has a modern color for mixed rain and snow', () => {
        expect(precipitationFill('modern', 'mixed', '#4681C3', 100).color).toBe('#1CACE2');
    });
});

describe('precipKind', () => {
    it('reads snow and mixed rain/snow from the weather item', () => {
        expect(precipKind({})).toBe('rain');
        expect(precipKind({ precipShowSnow: true })).toBe('snow');
        expect(precipKind({ mixedRainSnow: true })).toBe('mixed');
    });
});

describe('dataTint', () => {
    it('grows with the precipitation amount, weighted by its probability', () => {
        expect(dataTint('precipAccumulation', { precipAccumulation: 10 })).toEqual({ color: '#378ADD', fraction: 1 });
        expect(dataTint('precipAccumulation', { precipAccumulation: 2.5, precipProbability: 50 })).toEqual({ color: '#378ADD', fraction: 0.25 });
        expect(dataTint('precipAccumulation', { precipAccumulation: 40, precipProbability: -1 }).fraction).toBe(1);
    });
    it('uses the snow color for snow', () => {
        expect(dataTint('precipAccumulation', { precipAccumulation: 10, precipShowSnow: true }).color).toBe('#00CDE6');
        expect(dataTint('snowfall', { snowfall: 10 })).toEqual({ color: '#00CDE6', fraction: 1 });
    });
    it('follows the cloud cover and the UV index with its level color', () => {
        expect(dataTint('cloudCover', { cloudCover: 60 })).toEqual({ color: '#888780', fraction: 0.6 });
        expect(dataTint('uvIndex', { uvIndex: 22, uvIndexColor: '#9E47CC' })).toEqual({ color: '#9E47CC', fraction: 1 });
    });
    it('has no tint for other data or no value', () => {
        expect(dataTint('windSpeed', { cloudCover: 60 })).toBeUndefined();
        expect(dataTint('cloudCover', {})).toBeUndefined();
        expect(dataTint('precipAccumulation', { precipAccumulation: 0 })).toBeUndefined();
    });
});

describe('tintAlpha', () => {
    it('goes from the card background opacity up to a readable maximum', () => {
        expect(tintAlpha(0, false)).toBe(6);
        expect(tintAlpha(1, false)).toBe(80);
        expect(tintAlpha(1, true)).toBe(110);
    });
});

describe('modernDataColor', () => {
    it('returns the modern palette color of a data', () => {
        expect(modernDataColor('sealevelPressure')).toBe('#7F77DD');
    });
    it('returns undefined for a data without palette color', () => {
        expect(modernDataColor('unknown')).toBeUndefined();
    });
});

describe('modernLineStyle', () => {
    it('gives each kind of data its own stroke', () => {
        expect(modernLineStyle('windSpeed')).toEqual({ width: 1.5 });
        expect(modernLineStyle('windGust')).toEqual({ width: 1.5, dash: [2, 4] });
        expect(modernLineStyle('sealevelPressure')).toEqual({ width: 1.5, dash: [8, 6] });
    });
    it('falls back to a thin dashed line', () => {
        expect(modernLineStyle('unknown')).toEqual({ width: 1.5, dash: [6, 4] });
    });
});

describe('windSpeedColor', () => {
    it('keeps the calm color for normal wind', () => {
        expect(windSpeedColor(20, '#EF9F27')).toBe('#EF9F27');
    });
    it('warns for strong and violent wind', () => {
        expect(windSpeedColor(45, '#EF9F27')).toBe('#FFBC03');
        expect(windSpeedColor(70, '#EF9F27')).toBe('#ff0353');
    });
});

describe('splitTimePeriod', () => {
    it('splits the AM/PM marker from the time', () => {
        expect(splitTimePeriod('10:00 PM')).toEqual({ time: '10:00', period: 'PM' });
        expect(splitTimePeriod('9:00 a.m.')).toEqual({ time: '9:00', period: 'a.m.' });
    });
    it('keeps a 24h time whole', () => {
        expect(splitTimePeriod('22:00')).toEqual({ time: '22:00', period: '' });
    });
});

describe('cardBackgroundAlpha', () => {
    it('is lighter on light themes than on dark ones', () => {
        expect(cardBackgroundAlpha(false)).toBe(6);
        expect(cardBackgroundAlpha(true)).toBe(14);
    });
});
