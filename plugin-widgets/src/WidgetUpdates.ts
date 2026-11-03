// shares one in-flight update between the widgets that use the same key (same location and provider)
export function createUpdateDeduper<T>() {
    const pending = new Map<string, Promise<T>>();
    return {
        run(key: string, task: () => Promise<T>): Promise<T> {
            const existing = pending.get(key);
            if (existing) {
                return existing;
            }
            const promise = task().finally(() => pending.delete(key));
            pending.set(key, promise);
            return promise;
        },
        clear() {
            pending.clear();
        }
    };
}
