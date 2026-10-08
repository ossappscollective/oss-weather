// Helpers to compose new icons from Tabler outline icons.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const tablerDir = join(resolve(import.meta.dirname, '..'), 'node_modules/@tabler/icons/icons');

export function tablerShapes(name, variant = 'outline') {
    const svg = readFileSync(join(tablerDir, variant, `${name}.svg`), 'utf8');
    const body = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
    // drop Tabler's invisible 24x24 bounding box
    return body.replace(/<path stroke="none"[^>]*\/>/g, '').trim();
}

// gives each shape of the markup its own stroke color, in order (the last color repeats)
export function colorShapes(markup, colors) {
    let index = 0;
    return markup.replace(/<(path|circle|line|polyline|polygon|rect|ellipse)\b/g, (element) => `${element} stroke="${colors[Math.min(index++, colors.length - 1)]}"`);
}

// a layer is { source, transform?, mask?, colors? } or { markup } (raw markup, or a function of the stroke width);
// scaled layers keep the base stroke width visually
export function toSvg(layers, baseStrokeWidth, defs = '') {
    const content = layers.map(({ colors, markup, mask, source, transform }) => {
        const scale = transform?.match(/scale\(([\d.]+)/);
        const strokeWidth = scale ? ` stroke-width="${(baseStrokeWidth / parseFloat(scale[1])).toFixed(2)}"` : '';
        const rawShapes = typeof markup === 'function' ? markup(baseStrokeWidth) : (markup ?? tablerShapes(source));
        const shapes = colors ? colorShapes(rawShapes, colors) : rawShapes;
        const group = `<g${transform ? ` transform="${transform}"` : ''}${strokeWidth}>${shapes}</g>`;
        return mask ? `<g mask="url(#${mask})">${group}</g>` : group;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="${baseStrokeWidth}" stroke-linecap="round" stroke-linejoin="round">${defs ? `<defs>${defs}</defs>` : ''}${content.join('')}</svg>\n`;
}

export function toFilledSvg(name) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#000000" stroke="none">${tablerShapes(name, 'filled')}</svg>\n`;
}
