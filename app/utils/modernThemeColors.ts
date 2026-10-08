function channels(hex: string) {
    const value = hex.replace('#', '').slice(0, 6);
    return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

// opaque blend of two #rrggbb colors (ratio 0 = from, 1 = to)
export function mixColors(from: string, to: string, ratio: number) {
    const start = channels(from);
    const end = channels(to);
    return (
        '#' +
        start
            .map((channel, index) =>
                Math.round(channel + (end[index] - channel) * ratio)
                    .toString(16)
                    .padStart(2, '0')
            )
            .join('')
    );
}

const MODERN_ACCENT = '#378add';

// modern style colors: a neutral background (white, near black or black) and cards, tiles and lines
// as opaque tints of the text color over it, so they work on any theme color
export function modernThemeColors(onSurface: string, theme: string, dark: boolean) {
    const background = theme === 'black' ? '#000000' : dark ? '#121212' : '#ffffff';
    const tint = (lightRatio: number, darkRatio: number) => mixColors(background, onSurface, dark ? darkRatio : lightRatio);
    return {
        colorModernBackground: background,
        // popovers, dialogs and sheets
        colorModernSurface: theme === 'black' ? '#121212' : dark ? '#1e1e1e' : '#ffffff',
        colorModernCard: tint(0.045, 0.07),
        colorModernTile: tint(0.09, 0.13),
        colorModernHairline: tint(0.1, 0.14),
        colorModernHairlineStrong: tint(0.2, 0.26),
        colorModernAccent: MODERN_ACCENT,
        colorModernOnAccent: '#ffffff'
    };
}
