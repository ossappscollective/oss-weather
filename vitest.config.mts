import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [
            // before '~': `~/utils/ui` only has platform files, tests mock it
            { find: /^~\/utils\/ui$/, replacement: resolve(__dirname, 'vitest.stub.ts') },
            { find: '~', replacement: resolve(__dirname, 'app') },
            { find: '@shared', replacement: resolve(__dirname, 'tools/app') },
            // native packages with no entry Vitest can resolve (only platform files): tests mock them
            { find: '@nativescript-community/ui-canvas', replacement: resolve(__dirname, 'vitest.stub.ts') },
            { find: '@nativescript-community/geocoding', replacement: resolve(__dirname, 'vitest.stub.ts') }
        ]
    },
    test: {
        environment: 'node',
        include: ['app/**/*.test.ts', 'map/src/**/*.test.ts', 'plugin-widgets/scripts/**/*.test.ts', 'plugin-widgets/src/**/*.test.ts']
    }
});
