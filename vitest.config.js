import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  plugins: [
    react(),
    Icons({
      compiler: 'jsx',
      autoInstall: true,
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ['./src/setupTests.js'],
    exclude: [
      '**/node_modules/**',
      '**/src-tauri/**',
      '**/Mobile/**',
      '**/PublicLinksite/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    alias: {
      '~icons/': 'virtual:icons/',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src-tauri/', 'Mobile/', 'PublicLinksite/'],
      // Baseline measured on the desktop/web suite. Raise these as new tests land.
      thresholds: {
        branches: 11,
        functions: 8,
        lines: 16,
        statements: 15,
      },
    },
    deps: {
      inline: [/prosemirror/, /unplugin-icons/, /@iconify/, /react-remove-scroll/],
    },
  },
  resolve: {
    alias: {
      '~icons/': 'virtual:icons/',
    },
  },
});
