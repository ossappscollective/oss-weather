import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '~': resolve(__dirname, 'app'),
            '@shared': resolve(__dirname, 'tools/app'),
            // native packages with no entry Vitest can resolve (only platform files): tests mock them
            '@nativescript-community/ui-canvas': resolve(__dirname, 'vitest.stub.ts'),
            '@nativescript-community/geocoding': resolve(__dirname, 'vitest.stub.ts')
        }
    },
    test: {
        environment: 'node',
        include: ['app/**/*.test.ts', 'map/src/**/*.test.ts', 'plugin-widgets/scripts/**/*.test.ts', 'plugin-widgets/src/**/*.test.ts']
    }
});
