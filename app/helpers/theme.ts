import { getRealTheme, isEInk } from '@shared/helpers/theme';
import { globalObservable } from '@shared/utils/svelte/ui';
import { writable } from 'svelte/store';

export * from '@shared/helpers/theme';

// isEInk is a plain `let` (not usable in svelte markup): this store follows it
export const isEInkStore = writable(isEInk);

// the color theme changes at runtime: views drawing with canvas refresh on theme changes only
globalObservable.on('color_theme', () => {
    isEInkStore.set(isEInk);
    globalObservable.notify({ eventName: 'theme', data: getRealTheme() });
});
