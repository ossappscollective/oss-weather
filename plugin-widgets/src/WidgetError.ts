// 'network': nothing the user can act on, shown generically. 'code': the message is shown so it can be reported
export type WidgetErrorKind = 'network' | 'code';

interface WidgetErrorLike {
    customErrorConstructorName?: string;
    statusCode?: number;
    message?: string;
}

// errors that did not go through wrapNativeHttpException (raw runtime / native messages)
const NETWORK_MESSAGE = /timed out|timeout|SocketException|ConnectException|SSLException|UnknownHost|unable to resolve host|offline|connection (was )?lost|no network|network is unreachable/i;
const UNHANDLED_REJECTION_PREFIX = /^\(Unhandled promise rejection\):\s*/;

function errorMessage(error: unknown) {
    if (typeof error === 'string') {
        return error;
    }
    return (error as WidgetErrorLike)?.message ?? '';
}

export function classifyWidgetError(error: unknown): WidgetErrorKind {
    const { customErrorConstructorName, statusCode } = (typeof error === 'object' && (error as WidgetErrorLike)) || {};
    if (customErrorConstructorName === 'TimeoutError' || customErrorConstructorName === 'NoNetworkError') {
        return 'network';
    }
    if (customErrorConstructorName === 'HTTPError') {
        // -1: the request never got an answer. 429 / 5xx: the provider is down or limiting, not the app
        return statusCode === -1 || statusCode === 429 || statusCode >= 500 ? 'network' : 'code';
    }
    return NETWORK_MESSAGE.test(errorMessage(error)) ? 'network' : 'code';
}

export function widgetErrorMessage(error: unknown) {
    return errorMessage(error).replace(UNHANDLED_REJECTION_PREFIX, '') || 'Update failed';
}
