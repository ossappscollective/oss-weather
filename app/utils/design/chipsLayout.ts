export interface ChipsLayout {
    lineCount: number;
    chips: { x: number; line: number }[];
}

export function layoutChips(widths: number[], maxWidth: number, gap: number, align: 'left' | 'center' | 'right' = 'left'): ChipsLayout {
    const chips: ChipsLayout['chips'] = [];
    let x = 0;
    let line = 0;
    for (const width of widths) {
        if (x > 0 && x + width > maxWidth) {
            line++;
            x = 0;
        }
        chips.push({ x, line });
        x += width + gap;
    }
    if (align !== 'left') {
        // shift each line by its free space, all of it (right) or half (center)
        const lineWidths: number[] = [];
        chips.forEach((chip, index) => {
            lineWidths[chip.line] = chip.x + widths[index];
        });
        const factor = align === 'center' ? 0.5 : 1;
        chips.forEach((chip) => {
            chip.x += (maxWidth - lineWidths[chip.line]) * factor;
        });
    }
    return { lineCount: chips.length ? line + 1 : 0, chips };
}

// the alignment setting is a free string
export function chipsAlignment(value: string): 'left' | 'center' | 'right' {
    return value === 'center' || value === 'right' ? value : 'left';
}
