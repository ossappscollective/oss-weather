/** True when `key` was entered by the user, not empty and not the key embedded at build time. */
export function isUserApiKey(key: string | null | undefined, defaultKey: string): boolean {
    return !!key && key.length > 0 && key !== defaultKey;
}
