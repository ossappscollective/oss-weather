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
