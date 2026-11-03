import { describe, expect, it } from 'vitest';
import { classifyWidgetError, widgetErrorMessage } from './WidgetError';

describe('classifyWidgetError', () => {
    it('treats the typed network errors as network', () => {
        expect(classifyWidgetError({ customErrorConstructorName: 'TimeoutError', message: 'x' })).toBe('network');
        expect(classifyWidgetError({ customErrorConstructorName: 'NoNetworkError', message: 'x' })).toBe('network');
    });

    it('treats an unreachable provider as network', () => {
        expect(classifyWidgetError({ customErrorConstructorName: 'HTTPError', statusCode: -1, message: 'x' })).toBe('network');
        expect(classifyWidgetError({ customErrorConstructorName: 'HTTPError', statusCode: 429, message: 'x' })).toBe('network');
        expect(classifyWidgetError({ customErrorConstructorName: 'HTTPError', statusCode: 503, message: 'x' })).toBe('network');
    });

    it('keeps the other HTTP errors as code, the message is useful (bad key, bad request)', () => {
        expect(classifyWidgetError({ customErrorConstructorName: 'HTTPError', statusCode: 401, message: 'Invalid API key' })).toBe('code');
    });

    it('recognises untyped network failures from their message', () => {
        expect(classifyWidgetError(new Error('(Unhandled promise rejection): The request timed out.'))).toBe('network');
        expect(classifyWidgetError(new Error('java.net.SocketTimeoutException: timeout'))).toBe('network');
        expect(classifyWidgetError(new Error('java.net.UnknownHostException: Unable to resolve host "api.open-meteo.com"'))).toBe('network');
        expect(classifyWidgetError('The Internet connection appears to be offline.')).toBe('network');
    });

    it('treats everything else as code', () => {
        expect(classifyWidgetError(new TypeError("Cannot read properties of undefined (reading 'time')"))).toBe('code');
        expect(classifyWidgetError(new Error('No configuration found for widget 12'))).toBe('code');
        expect(classifyWidgetError(undefined)).toBe('code');
    });
});

describe('widgetErrorMessage', () => {
    it('drops the runtime unhandled rejection prefix', () => {
        expect(widgetErrorMessage(new Error('(Unhandled promise rejection): boom'))).toBe('boom');
    });

    it('accepts a string and falls back when there is no message', () => {
        expect(widgetErrorMessage('boom')).toBe('boom');
        expect(widgetErrorMessage(undefined)).toBe('Update failed');
        expect(widgetErrorMessage(new Error(''))).toBe('Update failed');
    });
});
