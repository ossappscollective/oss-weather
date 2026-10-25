export interface EInkChipStyle {
    strokeColor: string;
    strokeWidth: number;
    textColor: string;
}

// e-ink screens dither fills and alpha tints to black: chips are only outlined, a warning gets a thicker line
export function einkChipStyle(warning: boolean, onSurface: string): EInkChipStyle {
    return { strokeColor: onSurface, strokeWidth: warning ? 2 : 1, textColor: onSurface };
}
