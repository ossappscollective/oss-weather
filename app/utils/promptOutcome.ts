export enum PromptOutcome {
    Save,
    Clear,
    Ignore
}

// the neutral button resolves the prompt with `result: undefined`, cancel with `false`
export function promptOutcome(answer?: { result?: boolean; text: string }): PromptOutcome {
    if (!answer) {
        return PromptOutcome.Ignore;
    }
    if (answer.result === undefined) {
        return PromptOutcome.Clear;
    }
    return answer.result && answer.text.length > 0 ? PromptOutcome.Save : PromptOutcome.Ignore;
}
