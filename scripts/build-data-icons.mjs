// Builds the "ossweatherdata" icon fonts (wd- prefix) from Tabler outline icons.
// Glyph names mirror the classic wi-/mdi-/app- names so the modern style can map them 1:1.
// The thin variant shares the codepoints (same lock file) so small icons only switch typeface.
// usage: node scripts/build-data-icons.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { toSvg } from './tabler-svg.mjs';
import { MOON_PHASES, beaufortMarkup, moonPhaseMarkup } from './weather-glyphs.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
// Tabler draws with a 2 stroke; a bit heavier reads better at data icon sizes, not at small ones
const FONTS = [
    { family: 'ossweatherdata', strokeWidth: 2.5, styles: true },
    { family: 'ossweatherdata-thin', strokeWidth: 2, styles: false }
];

const ICONS = {
    raindrop: 'droplet',
    'snowflake-cold': 'snowflake',
    'rain-snow': [
        { source: 'droplet', transform: 'translate(-1.6 4.8) scale(0.6)' },
        { source: 'snowflake', transform: 'translate(9.6 4.8) scale(0.6)' }
    ],
    cloud: 'cloud',
    humidity: 'droplet-half-2',
    barometer: 'gauge',
    windy: 'wind',
    'strong-wind': 'windsock',
    thermometer: 'temperature',
    'thermometer-high': 'temperature-plus',
    'thermometer-low': 'temperature-minus',
    'thermometer-water': 'droplets',
    'umbrella-outline': 'umbrella',
    'snow-depth': [
        { source: 'snowflake', transform: 'translate(-1.6 4.8) scale(0.6)' },
        { source: 'arrows-vertical', transform: 'translate(9.6 4.8) scale(0.6)' }
    ],
    'snowflake-thermometer': 'temperature-snow',
    'weather-sunny-alert': 'uv-index',
    leaf: 'leaf',
    'theme-light-dark': 'sun-moon',
    'coolant-temperature': 'temperature-sun',
    'waves-arrow-up': 'ripple',
    'wave-arrow-up': 'wave-sine',
    refresh: 'refresh',
    sunrise: 'sunrise',
    sunset: 'sunset'
};
// not in Tabler: drawn in its style
MOON_PHASES.forEach((phase, index) => {
    ICONS[`moon-${phase}`] = [{ markup: moonPhaseMarkup(index) }];
});
for (let level = 0; level <= 12; level++) {
    ICONS[`wind-beaufort-${level}`] = [{ markup: (strokeWidth) => beaufortMarkup(level, strokeWidth) }];
}
// classic app-wind_N arrows point downwind: wind_0 points down, each step turns 45° clockwise
// scaled down so the diagonal ones stay inside the em box
for (let index = 0; index < 8; index++) {
    ICONS[`wind_${index}`] = [{ source: 'navigation', transform: `rotate(${180 + index * 45} 12 12) translate(1.2 1.2) scale(0.9)` }];
}

// init numbers glyphs alphabetically: keep the codes already published in the lock, append new glyphs after them
const lockFile = join(projectRoot, 'codepoints.lock');
const lockedCodes = {};
const originalLock = existsSync(lockFile) ? readFileSync(lockFile, 'utf8') : null;
if (originalLock) {
    for (const [, name, code] of originalLock.matchAll(/^([^#\s]\S*)\tU\+([0-9a-f]+)$/gm)) {
        lockedCodes[name] = code;
    }
}
let nextCode = Math.max(0xe8ff, ...Object.values(lockedCodes).map((code) => parseInt(code, 16))) + 1;
const codes = {};
for (const name of Object.keys(ICONS).sort()) {
    codes[name] = lockedCodes[name] ?? (nextCode++).toString(16);
}

const iconotype = (...args) => execFileSync('npx', ['iconotype', ...args], { cwd: projectRoot, stdio: 'inherit' });
const stagingDir = mkdtempSync(join(tmpdir(), 'ossweatherdata-'));
try {
    for (const { family, strokeWidth, styles } of FONTS) {
        const svgDir = join(stagingDir, family);
        mkdirSync(svgDir);
        for (const [name, source] of Object.entries(ICONS)) {
            writeFileSync(join(svgDir, `${name}.svg`), toSvg(typeof source === 'string' ? [{ source }] : source, strokeWidth));
        }
        const projectFile = join(projectRoot, `${family}.iconotype.json`);
        iconotype('init', '-i', svgDir, '--name', family, '--prefix', 'wd-', '--fonts-dir', 'app/fonts', '--styles-dir', 'css', '--style-kind', 'scss-variables', '--out', projectFile);
        // a project "output" block wins over --formats, and the app only loads ttf
        if (originalLock) {
            // init rewrites the lock with its own numbering
            writeFileSync(lockFile, originalLock);
        }
        const project = JSON.parse(readFileSync(projectFile, 'utf8'));
        for (const icon of project.icons) {
            icon.code = codes[icon.name];
        }
        project.output.fonts.formats = ['ttf'];
        // Material Design Icons metrics (12.5% of the em under the baseline): glyphs are centered at the
        // height of text capitals, so icons and text in one label line up
        project.font.baseline = 12.5;
        if (!styles) {
            delete project.output.styles;
        }
        project.credits = [{ name: 'Tabler Icons', license: 'MIT', licenseURL: 'https://github.com/tabler/tabler-icons/blob/main/LICENSE', url: 'https://tabler.io/icons' }];
        writeFileSync(projectFile, JSON.stringify(project, null, 2) + '\n');
        iconotype('build', '-i', projectFile);
    }
} finally {
    rmSync(stagingDir, { recursive: true, force: true });
}
