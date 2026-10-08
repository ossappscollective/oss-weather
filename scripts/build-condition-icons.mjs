// Builds weather condition SVGs (one per OpenWeatherMap code, like the image icon themes) from Tabler icons.
// Day/night variants missing in Tabler are composed: a smaller cloud bottom right, the sun or moon top left,
// cut around the cloud with a mask.
// Each part is colored (cloud, rain, sun...); the root svg carries data-main-color for single color renders.
// usage: node scripts/build-condition-icons.mjs
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { toSvg } from './tabler-svg.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const outputDir = join(projectRoot, 'svgs/weather-conditions');
const STROKE_WIDTH = 2;
const CLOUD_TRANSFORM = 'translate(3.5 4) scale(0.85)';
const SKY_TRANSFORM = 'scale(0.6)';

const cloudPath = readFileSync(join(projectRoot, 'node_modules/@tabler/icons/icons/outline/cloud.svg'), 'utf8')
    .match(/<path d="[^"]+"/g)
    .at(-1);
// white keeps, black cuts: the thick black stroke leaves a gap between the sky body and the cloud
const CLOUD_MASK = `<mask id="cloud"><rect x="-2" y="-2" width="28" height="28" fill="#ffffff" stroke="none"/>${cloudPath.replace('<path', `<path transform="${CLOUD_TRANSFORM}" fill="#000000" stroke="#000000" stroke-width="5"`)}/></mask>`;

const ROLE_COLORS = {
    sun: '#EF9F27',
    moon: '#7F77DD',
    cloud: '#888780',
    rain: '#378ADD',
    snow: '#00CDE6',
    bolt: '#EF9F27',
    fog: '#888780',
    wind: '#888780',
    tornado: '#5F5E5A'
};
// role of each shape of a Tabler icon, in order (the last one repeats)
const PART_ROLES = {
    sun: ['sun'],
    moon: ['moon'],
    cloud: ['cloud'],
    'cloud-rain': ['cloud', 'rain'],
    'cloud-snow': ['cloud', 'snow'],
    'cloud-storm': ['cloud', 'bolt'],
    'cloud-bolt': ['cloud', 'bolt'],
    'cloud-fog': ['cloud', 'fog'],
    haze: ['sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'fog'],
    'haze-moon': ['fog', 'fog', 'moon'],
    mist: ['fog'],
    tornado: ['tornado'],
    snowflake: ['snow'],
    wind: ['wind'],
    'sun-wind': ['sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'wind']
};
// color of the single color version: what matters most in the icon
const MAIN_ROLE = {
    sun: 'sun',
    moon: 'moon',
    cloud: 'cloud',
    'cloud-rain': 'rain',
    'cloud-snow': 'snow',
    'cloud-storm': 'bolt',
    'cloud-bolt': 'bolt',
    'cloud-fog': 'fog',
    haze: 'fog',
    'haze-moon': 'fog',
    mist: 'fog',
    tornado: 'tornado',
    snowflake: 'snow',
    wind: 'wind',
    'sun-wind': 'wind'
};
const colorsOf = (source) => PART_ROLES[source].map((role) => ROLE_COLORS[role]);
const withMainColor = (svg, role) => svg.replace('<svg ', `<svg data-main-color="${ROLE_COLORS[role]}" `);

function sky(cloud, isDay) {
    const skySource = isDay ? 'sun' : 'moon';
    const svg = toSvg(
        [
            { source: skySource, transform: SKY_TRANSFORM, mask: 'cloud', colors: colorsOf(skySource) },
            { source: cloud, transform: CLOUD_TRANSFORM, colors: colorsOf(cloud) }
        ],
        STROKE_WIDTH,
        CLOUD_MASK
    );
    // a plain cloud over the sun/moon is mostly about the sky
    return withMainColor(svg, cloud === 'cloud' ? MAIN_ROLE[skySource] : MAIN_ROLE[cloud]);
}
const plain = (source) => withMainColor(toSvg([{ source, colors: colorsOf(source) }], STROKE_WIDTH), MAIN_ROLE[source]);

// code -> icon; a 'd'/'n' pair gets the sun/moon composition
const DAY_NIGHT = {
    200: 'cloud-storm',
    202: 'cloud-storm',
    210: 'cloud-bolt',
    211: 'cloud-bolt',
    221: 'cloud-bolt',
    300: 'cloud-rain',
    500: 'cloud-rain',
    502: 'cloud-rain',
    504: 'cloud-rain',
    600: 'cloud-snow',
    601: 'cloud-snow',
    611: 'cloud-snow',
    616: 'cloud-snow',
    802: 'cloud'
};
const SINGLE = {
    201: 'cloud-storm',
    212: 'cloud-bolt',
    310: 'cloud-rain',
    321: 'cloud-rain',
    503: 'cloud-rain',
    520: 'cloud-rain',
    602: 'snowflake',
    613: 'cloud-snow',
    620: 'cloud-snow',
    621: 'cloud-snow',
    701: 'mist',
    711: 'haze',
    761: 'wind',
    771: 'wind',
    781: 'tornado',
    804: 'cloud'
};
const EXPLICIT = {
    '721d': 'haze',
    '721n': 'haze-moon',
    '731d': 'sun-wind',
    '731n': 'wind',
    '741d': 'cloud-fog',
    '741n': 'cloud-fog',
    '800d': 'sun',
    '800n': 'moon'
};

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
for (const [code, cloud] of Object.entries(DAY_NIGHT)) {
    writeFileSync(join(outputDir, `${code}d.svg`), sky(cloud, true));
    writeFileSync(join(outputDir, `${code}n.svg`), sky(cloud, false));
}
for (const [name, source] of Object.entries({ ...SINGLE, ...EXPLICIT })) {
    writeFileSync(join(outputDir, `${name}.svg`), plain(source));
}
