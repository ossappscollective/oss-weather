import { describe, expect, it } from 'vitest';
import { AQI_THRESHOLDS, POLLEN_THRESHOLDS, levelIndex } from './airQualityLevel';

describe('levelIndex', () => {
    it('places the european AQI in its band', () => {
        expect(levelIndex(10, AQI_THRESHOLDS)).toBe(0);
        expect(levelIndex(20, AQI_THRESHOLDS)).toBe(1);
        expect(levelIndex(38, AQI_THRESHOLDS)).toBe(1);
        expect(levelIndex(65, AQI_THRESHOLDS)).toBe(3);
        expect(levelIndex(150, AQI_THRESHOLDS)).toBe(5);
    });
    it('keeps zero pollen in the lowest band', () => {
        expect(levelIndex(0, POLLEN_THRESHOLDS)).toBe(0);
        expect(levelIndex(30, POLLEN_THRESHOLDS)).toBe(2);
    });
    it('is null without a value', () => {
        expect(levelIndex(null, AQI_THRESHOLDS)).toBeNull();
    });
});
