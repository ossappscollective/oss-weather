// Tabler-style glyphs that Tabler does not have: moon phases and Beaufort levels.
// They return raw SVG markup for a 24x24 icon, drawn with the stroke attributes of the parent <svg>.

export const MOON_PHASES = [
    'new',
    ...[1, 2, 3, 4, 5, 6].map((index) => `waxing-crescent-${index}`),
    'first-quarter',
    ...[1, 2, 3, 4, 5, 6].map((index) => `waxing-gibbous-${index}`),
    'full',
    ...[1, 2, 3, 4, 5, 6].map((index) => `waning-gibbous-${index}`),
    'third-quarter',
    ...[1, 2, 3, 4, 5, 6].map((index) => `waning-crescent-${index}`)
];

const OUTLINE_RADIUS = 9;
// the lit part sits inside the outline, with a gap
const LIT_RADIUS = 6.5;

// phase index 0..27 (0 new, 7 first quarter, 14 full, 21 third quarter): circle outline + filled lit part
export function moonPhaseMarkup(index) {
    const outline = `<circle cx="12" cy="12" r="${OUTLINE_RADIUS}"/>`;
    const phase = index / MOON_PHASES.length;
    if (index === 0) {
        return outline;
    }
    const r = LIT_RADIUS;
    if (index === 14) {
        return `${outline}<circle cx="12" cy="12" r="${r}" fill="#000000" stroke="none"/>`;
    }
    const waxing = phase < 0.5;
    // half-ellipse radius of the terminator
    const terminator = Math.max(0.01, Math.abs(Math.cos(phase * 2 * Math.PI)) * r).toFixed(3);
    const crescent = phase < 0.25 || phase > 0.75;
    // lit half on the right when waxing (northern hemisphere), on the left when waning;
    // the terminator bulges toward the lit side for a crescent, away from it for a gibbous moon
    const halfSweep = waxing ? 1 : 0;
    const terminatorSweep = waxing === crescent ? 0 : 1;
    const top = 12 - r;
    const bottom = 12 + r;
    const lit = `M12 ${top}A${r} ${r} 0 0 ${halfSweep} 12 ${bottom}A${terminator} ${r} 0 0 ${terminatorSweep} 12 ${top}Z`;
    return `${outline}<path d="${lit}" fill="#000000" stroke="none"/>`;
}

// rounded stroke digits in a 5x8 box
const DIGITS = {
    0: 'M0 1.5a1.5 1.5 0 0 1 1.5 -1.5h2a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1 -1.5 1.5h-2a1.5 1.5 0 0 1 -1.5 -1.5z',
    1: 'M1 2l2 -2v8',
    2: 'M0 1.5a1.5 1.5 0 0 1 1.5 -1.5h2a1.5 1.5 0 0 1 1.5 1.5c0 2 -5 4 -5 6.5h5',
    3: 'M0 0h5l-2.5 3.5a2.25 2.25 0 1 1 -2.5 3.75',
    4: 'M3.5 8v-8l-3.5 5.5h5',
    5: 'M5 0h-4.5l-0.5 3.5h2.25a2.25 2.25 0 1 1 0 4.5h-2.25',
    6: 'M4.5 0h-1.5a3 3 0 0 0 -3 3v2.5a2.5 2.5 0 0 0 5 0a2.5 2.5 0 0 0 -5 0',
    7: 'M0 0h5l-3 8',
    8: 'M2.5 3.5a1.75 1.75 0 1 0 0 -3.5a1.75 1.75 0 1 0 0 3.5zM2.5 8a2.25 2.25 0 1 0 0 -4.5a2.25 2.25 0 1 0 0 4.5z',
    9: 'M0.5 8h1.5a3 3 0 0 0 3 -3v-2.5a2.5 2.5 0 0 0 -5 0a2.5 2.5 0 0 0 5 0'
};
const DIGIT_WIDTH = 5;
const DIGIT_GAP = 1.5;

// Beaufort level 0..12: circle outline + the level number
export function beaufortMarkup(level, baseStrokeWidth) {
    const digits = String(level).split('');
    const scale = digits.length > 1 ? 0.75 : 1;
    const width = (digits.length * DIGIT_WIDTH + (digits.length - 1) * DIGIT_GAP) * scale;
    const left = 12 - width / 2;
    const top = 12 - 4 * scale;
    const paths = digits.map((digit, index) => `<path transform="translate(${index * (DIGIT_WIDTH + DIGIT_GAP)} 0)" d="${DIGITS[digit]}"/>`).join('');
    return `<circle cx="12" cy="12" r="${OUTLINE_RADIUS}"/><g transform="translate(${left.toFixed(3)} ${top}) scale(${scale})" stroke-width="${((baseStrokeWidth * 0.8) / scale).toFixed(2)}">${paths}</g>`;
}
