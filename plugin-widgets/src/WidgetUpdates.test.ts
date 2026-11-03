import { describe, expect, it, vi } from 'vitest';
import { createUpdateDeduper } from './WidgetUpdates';

describe('createUpdateDeduper', () => {
    it('shares one task between concurrent runs of the same key', async () => {
        const deduper = createUpdateDeduper<string>();
        const task = vi.fn().mockResolvedValue('data');
        const results = await Promise.all([deduper.run('paris', task), deduper.run('paris', task)]);
        expect(results).toEqual(['data', 'data']);
        expect(task).toHaveBeenCalledTimes(1);
    });

    it('runs the task again after a success', async () => {
        const deduper = createUpdateDeduper<string>();
        const task = vi.fn().mockResolvedValue('data');
        await deduper.run('paris', task);
        await deduper.run('paris', task);
        expect(task).toHaveBeenCalledTimes(2);
    });

    it('runs the task again after a failure', async () => {
        const deduper = createUpdateDeduper<string>();
        await expect(deduper.run('paris', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
        const task = vi.fn().mockResolvedValue('data');
        await expect(deduper.run('paris', task)).resolves.toBe('data');
        expect(task).toHaveBeenCalledTimes(1);
    });

    it('rejects every concurrent run when the shared task fails', async () => {
        const deduper = createUpdateDeduper<string>();
        const task = vi.fn().mockRejectedValue(new Error('offline'));
        const results = await Promise.allSettled([deduper.run('paris', task), deduper.run('paris', task)]);
        expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
        expect(task).toHaveBeenCalledTimes(1);
    });

    it('keeps keys independent', async () => {
        const deduper = createUpdateDeduper<string>();
        const task = vi.fn().mockResolvedValue('data');
        await Promise.all([deduper.run('paris', task), deduper.run('rome', task)]);
        expect(task).toHaveBeenCalledTimes(2);
    });
});
