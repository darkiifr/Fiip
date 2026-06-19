import react from "@vitejs/plugin-react";
import Icons from 'unplugin-icons/vite';
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    Icons({
      compiler: 'jsx',
      autoInstall: true
    })
  ],

  optimizeDeps: {
    include: [
      'yjs',
      'y-prosemirror',
      '@hocuspocus/provider',
      // Radix UI primitives — pre-bundle for fast HMR
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-select',
      '@radix-ui/react-switch',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      // React Aria
      'react-aria',
      'react-aria-components',
      // Utilities
      'clsx',
      'tailwind-merge',
    ],
    exclude: ['@tauri-apps/api', '@tauri-apps/plugin-shell']
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      checks: {
        pluginTimings: false
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/')) {return 'vendor';}
            if (id.includes('pdfjs-dist/')) {return 'pdf';}
            if (id.includes('lucide-react/') || id.includes('marked/') || id.includes('dompurify/') || id.includes('clsx/') || id.includes('tailwind-merge/')) {return 'ui';}
            if (id.includes('i18next/') || id.includes('react-i18next/') || id.includes('i18next-browser-languagedetector/')) {return 'i18n';}
            if (id.includes('emoji-picker-react/')) {return 'emoji';}
            if (id.includes('@tiptap/')) {return 'tiptap';}
          }
        }
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
  },
}));
