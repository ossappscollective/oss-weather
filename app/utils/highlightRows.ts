// compare chart highlight: the value of each model at the touched time, highest first
export function highlightRows<Tint>(models: { name: string; color: Tint; value: number }[], unit: string) {
    return models
        .filter((model) => Number.isFinite(model.value))
        .sort((first, second) => second.value - first.value)
        .map(({ color, name, value }) => ({ name, color, text: Math.round(value * 10) / 10 + unit }));
}
