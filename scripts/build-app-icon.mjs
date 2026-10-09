// Builds the app icon ("rising sun": half amber disc on a blue horizon) for Android and iOS.
// The Android adaptive icon is a vector (res/drawable/ic_launcher_foreground.xml), this script
// renders the bitmaps: legacy Android launchers and the iOS icon set.
// usage: node scripts/build-app-icon.mjs
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const BACKGROUND = '#F4F6FA';

// 108 units canvas, the whole canvas is visible (iOS and legacy Android icons)
const ARTWORK =
    '<path d="M28 54a26 26 0 0 1 52 0z" fill="#EF9F27"/>' +
    '<path d="M20 54h68" stroke="#378ADD" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M34 66h40" stroke="#85B7EB" stroke-width="5" stroke-linecap="round"/>';

const BACKGROUNDS = {
    none: '',
    round: `<circle cx="54" cy="54" r="54" fill="${BACKGROUND}"/>`,
    rounded: `<rect width="108" height="108" rx="24" fill="${BACKGROUND}"/>`,
    square: `<rect width="108" height="108" fill="${BACKGROUND}"/>`
};

function iconSvg(shape) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${BACKGROUNDS[shape]}${ARTWORK}</svg>`;
}

function render(shape, size, file) {
    const png = new Resvg(iconSvg(shape), { fitTo: { mode: 'width', value: size } }).render().asPng();
    writeFileSync(file, png);
}

const ANDROID_DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(ANDROID_DENSITIES)) {
    const folder = join(projectRoot, 'App_Resources/Android/src/main/res', `mipmap-${density}`);
    render('rounded', size, join(folder, 'ic_launcher.png'));
    render('round', size, join(folder, 'ic_launcher_round.png'));
}

// iOS launch screen logo: the artwork alone
const logoFolder = join(projectRoot, 'App_Resources/iOS/Assets.xcassets/logo.imageset');
render('none', 341, join(logoFolder, 'logo.png'));
render('none', 682, join(logoFolder, 'logo@2x.png'));
render('none', 1024, join(logoFolder, 'logo@3x.png'));

// iOS masks the corners itself: full square, no transparency
const iosFolder = join(projectRoot, 'App_Resources/iOS/Assets.xcassets/AppIcon.appiconset');
const { images } = JSON.parse(readFileSync(join(iosFolder, 'Contents.json'), 'utf8'));
for (const image of images) {
    const size = Math.round(parseFloat(image.size) * parseFloat(image.scale));
    render('square', size, join(iosFolder, image.filename));
}
