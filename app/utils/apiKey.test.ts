import { describe, expect, it } from 'vitest';
import { isUserApiKey } from './apiKey';

describe('isUserApiKey', () => {
    it('rejects an empty or missing key', () => {
        expect(isUserApiKey(undefined, 'default')).toBe(false);
        expect(isUserApiKey(null, 'default')).toBe(false);
        expect(isUserApiKey('', 'default')).toBe(false);
    });
    it('rejects the key embedded at build time', () => {
        expect(isUserApiKey('default', 'default')).toBe(false);
    });
    it('accepts any other key', () => {
        expect(isUserApiKey('mykey', 'default')).toBe(true);
        expect(isUserApiKey('mykey', '')).toBe(true);
    });
    it('rejects an empty key even when the build default is empty', () => {
        expect(isUserApiKey('', '')).toBe(false);
    });
});
