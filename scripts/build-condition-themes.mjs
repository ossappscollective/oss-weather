// Renders svgs/weather-conditions into two weather icon themes (PNG, like the other themes):
// "tabler" keeps the colors of each part, "tabler_mono" draws each icon in its single main color.
// usage: node scripts/build-condition-icons.mjs && node scripts/build-condition-themes.mjs [--padding=0.12]
// padding: empty margin on each side, as a fraction of the image size (the other themes have one)
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const sourceDir = join(projectRoot, 'svgs/weather-conditions');
const themesDir = join(projectRoot, 'app/assets/icon_themes');
const SIZE = 256;
const paddingArgument = process.argv.find((argument) => argument.startsWith('--padding='));
const PADDING = paddingArgument ? parseFloat(paddingArgument.split('=')[1]) : 0.12;

// grow the 24x24 viewBox so the icon keeps PADDING of the image free on each side
function withPadding(svg) {
    const margin = (24 * PADDING) / (1 - 2 * PADDING);
    return svg.replace('viewBox="0 0 24 24"', `viewBox="${-margin} ${-margin} ${24 + 2 * margin} ${24 + 2 * margin}"`);
}

const THEMES = [
    {
        id: 'tabler',
        name: 'Tabler',
        description: 'line icons, colored by weather element',
        recolor: (svg) => svg
    },
    {
        id: 'tabler_mono',
        name: 'Tabler single color',
        description: 'line icons, one color per weather condition',
        // every part takes the main color; the mask (in <defs>) keeps its own black/white
        recolor: (svg) => {
            const mainColor = svg.match(/data-main-color="(#[0-9A-Fa-f]{6})"/)[1];
            const defsEnd = svg.indexOf('</defs>') + 1;
            const head = svg.slice(0, defsEnd);
            const body = svg.slice(defsEnd).replace(/(stroke|fill)="#[0-9A-Fa-f]{6}"/g, `$1="${mainColor}"`);
            return head + body;
        }
    }
];

for (const theme of THEMES) {
    const imagesDir = join(themesDir, theme.id, 'images');
    rmSync(join(themesDir, theme.id), { recursive: true, force: true });
    mkdirSync(imagesDir, { recursive: true });
    writeFileSync(join(themesDir, theme.id, 'config.json'), JSON.stringify({ id: theme.id, name: theme.name, description: theme.description, attribution: 'https://tabler.io/icons' }, null, 4) + '\n');
    for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.svg'))) {
        const svg = withPadding(theme.recolor(readFileSync(join(sourceDir, file), 'utf8')));
        const png = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE } }).render().asPng();
        writeFileSync(join(imagesDir, file.replace('.svg', '.png')), png);
    }
}
