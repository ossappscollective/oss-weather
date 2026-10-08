// Builds the "ossweather-ui" icon font: Tabler icons named after the Material Design Icons used in the app,
// at Material's own codepoints, so the mdi- build replacement keeps working and only the font changes.
// usage: node scripts/build-ui-icons.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { toFilledSvg, toSvg } from './tabler-svg.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const FAMILY = 'ossweather-ui';
const projectFile = join(projectRoot, `${FAMILY}.iconotype.json`);
const lockFile = join(projectRoot, `${FAMILY}.codepoints.lock`);
const STROKE_WIDTH = 2;

// mdi name -> Tabler outline icon, { filled } for a Tabler filled icon, { file } for a local svg
const ICONS = {
    alert: 'alert-triangle',
    animation: 'sparkles',
    'arrow-left': 'arrow-left',
    'bug-outline': 'bug',
    bullhorn: 'speakerphone',
    'cards-outline': 'cards',
    'chart-areaspline': 'chart-area-line',
    'chart-bar': 'chart-histogram',
    'chart-line': 'chart-line',
    check: 'check',
    'check-circle-outline': 'circle-check',
    'checkbox-blank-outline': 'square',
    'checkbox-marked-outline': 'square-check',
    'chevron-down': 'chevron-down',
    'chevron-left': 'chevron-left',
    'chevron-right': 'chevron-right',
    'circle-opacity': 'contrast',
    circle: { filled: 'circle' },
    'circle-outline': 'circle',
    'clock-outline': 'clock',
    close: 'x',
    'cloud-circle': 'cloud',
    cogs: 'settings',
    'content-copy': 'copy',
    'coolant-temperature': 'temperature-sun',
    'crosshairs-gps': 'current-location',
    database: 'database',
    'dots-grid': 'grid-dots',
    'dots-vertical': 'dots-vertical',
    'drag-horizontal': 'grip-horizontal',
    export: 'file-export',
    flower: 'flower',
    'format-list-bulleted-square': 'list',
    'format-size': 'text-size',
    fullscreen: 'maximize',
    'fullscreen-exit': 'minimize',
    gauge: 'gauge',
    github: 'brand-github',
    heart: { filled: 'heart' },
    history: 'history',
    'information-outline': 'info-circle',
    key: 'key',
    layers: 'stack-2',
    'layers-triple': 'stack-3',
    leaf: 'leaf',
    'lightning-bolt': 'bolt',
    'link-variant': 'link',
    magnify: 'search',
    map: 'map',
    'map-marker-circle': 'map-pin',
    'map-plus': 'map-plus',
    menu: 'menu-2',
    opacity: 'droplet-half',
    'open-in-app': 'external-link',
    palette: 'palette',
    play: 'player-play',
    plus: 'plus',
    radar: 'radar',
    refresh: 'refresh',
    rename: 'pencil',
    restore: 'restore',
    server: 'server',
    'share-variant': 'share',
    snowflake: 'snowflake',
    'snowflake-alert': 'snowflake',
    'snowflake-thermometer': 'temperature-snow',
    speedometer: 'dashboard',
    star: { filled: 'star' },
    'star-outline': 'star',
    'sun-thermometer-outline': 'temperature-sun',
    'temperature-celsius': 'temperature-celsius',
    'theme-light-dark': 'sun-moon',
    thermometer: 'temperature',
    'thermometer-high': 'temperature-plus',
    'thermometer-low': 'temperature-minus',
    'thermometer-water': 'droplets',
    timelapse: 'clock-play',
    translate: 'language',
    'trash-can': 'trash',
    tune: 'adjustments',
    'umbrella-outline': 'umbrella',
    'wave-arrow-up': 'wave-sine',
    waves: 'ripple',
    'waves-arrow-up': 'ripple',
    'weather-partly-cloudy': 'cloud',
    'weather-sunny': 'sun',
    'weather-sunny-alert': 'uv-index',
    'weather-sunset-down': 'sunset',
    'weather-sunset-up': 'sunrise',
    web: 'world',
    widgets: 'category'
};

const mdiCodes = {};
for (const [, name, code] of readFileSync(join(projectRoot, 'node_modules/@mdi/font/scss/_variables.scss'), 'utf8').matchAll(/"([a-z0-9-]+)": (F[0-9A-F]+)/g)) {
    mdiCodes[name] = code.toLowerCase();
}

const iconotype = (...args) => execFileSync('npx', ['iconotype', ...args], { cwd: projectRoot, stdio: 'inherit' });
const stagingDir = mkdtempSync(join(tmpdir(), `${FAMILY}-`));
try {
    const svgDir = join(stagingDir, FAMILY);
    mkdirSync(svgDir);
    for (const [name, source] of Object.entries(ICONS)) {
        if (!mdiCodes[name]) {
            throw new Error(`unknown mdi icon: ${name}`);
        }
        const target = join(svgDir, `${name}.svg`);
        if (typeof source === 'string') {
            // close Tabler rounded rectangles that end back on their start point: left open, iconotype fills them
            const svg = toSvg([{ source }], STROKE_WIDTH).replace(/d="([^"]+)"/g, (match, path) => (/a/.test(path) && /l0 -?[\d.]+$/.test(path) ? `d="${path}z"` : match));
            writeFileSync(target, svg);
        } else if (source.filled) {
            writeFileSync(target, toFilledSvg(source.filled));
        } else {
            copyFileSync(join(projectRoot, source.file), target);
        }
    }
    // init in the staging folder so its codepoint lock does not touch the data fonts one
    const stagedProject = join(stagingDir, `${FAMILY}.iconotype.json`);
    iconotype('init', '-i', svgDir, '--name', FAMILY, '--prefix', 'mdi-', '--fonts-dir', 'app/fonts', '--out', stagedProject);
    const project = JSON.parse(readFileSync(stagedProject, 'utf8'));
    for (const icon of project.icons) {
        icon.code = mdiCodes[icon.name];
    }
    project.output = { fonts: { dir: 'app/fonts', formats: ['ttf'] } };
    // Material Design Icons metrics (12.5% of the em under the baseline): glyphs are centered at the
    // height of text capitals, so icons and text in one label line up
    project.font.baseline = 12.5;
    project.credits = [{ name: 'Tabler Icons', license: 'MIT', licenseURL: 'https://github.com/tabler/tabler-icons/blob/main/LICENSE', url: 'https://tabler.io/icons' }];
    writeFileSync(projectFile, JSON.stringify(project, null, 2) + '\n');
    iconotype('build', '-i', projectFile, '--lock', lockFile);
} finally {
    rmSync(stagingDir, { recursive: true, force: true });
}
