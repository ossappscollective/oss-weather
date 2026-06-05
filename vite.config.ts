import { defineConfig } from 'vite';
import { javascriptConfig } from '@nativescript/vite/javascript';;

export default defineConfig(({ mode }) => javascriptConfig({ mode }));
