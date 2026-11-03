// splits a formatted weather value ("2.2 mm", "17°") so the unit can be shown apart from the number
export function splitValueUnit(value: string | number, subvalue?: string) {
    const match = (value + '').match(/^(-?[\d.,]+)\s*(.*)$/);
    if (!match) {
        return { amount: value + '', unit: '', extra: subvalue };
    }
    const [, amount, unit] = match;
    if (!unit && subvalue && !/\d/.test(subvalue)) {
        return { amount, unit: subvalue, extra: undefined };
    }
    return { amount, unit, extra: subvalue };
}

// sea temperature and waves change by tenths from an hour to the next: rounded to the unit, a chart line goes up and down while its value stays the same
const SEA_VALUE_KEYS = ['seaTemperature', 'waveHeight', 'waveHeightMax', 'swellHeight'];

// digits factor for the rounding of the value (10 is one decimal), undefined for the usual rounding
export function marineValueDigits(key: string): number | undefined {
    return SEA_VALUE_KEYS.indexOf(key) !== -1 ? 10 : undefined;
}
