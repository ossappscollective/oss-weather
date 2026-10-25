import { describe, expect, it } from 'vitest';
import { PromptOutcome, promptOutcome } from './promptOutcome';

describe('promptOutcome', () => {
    it('saves a non empty text on ok', () => {
        expect(promptOutcome({ result: true, text: 'abc' })).toBe(PromptOutcome.Save);
    });
    it('ignores an empty text on ok', () => {
        expect(promptOutcome({ result: true, text: '' })).toBe(PromptOutcome.Ignore);
    });
    it('ignores cancel', () => {
        expect(promptOutcome({ result: false, text: 'abc' })).toBe(PromptOutcome.Ignore);
    });
    it('clears on the neutral button', () => {
        expect(promptOutcome({ result: undefined, text: 'abc' })).toBe(PromptOutcome.Clear);
    });
    it('ignores a missing result', () => {
        expect(promptOutcome(undefined)).toBe(PromptOutcome.Ignore);
    });
});
