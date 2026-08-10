import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '~': resolve(__dirname, 'app'),
            '@shared': resolve(__dirname, 'tools/app')
        }
    },
    test: {
        environment: 'node',
        include: ['app/**/*.test.ts']
    }
});
