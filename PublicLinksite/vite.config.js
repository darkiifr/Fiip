import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'

function testIconMockPlugin() {
  return {
    name: 'fiip-test-icon-mock',
    enforce: 'pre',
    resolveId(id) {
      if (process.env.VITEST && id.startsWith('~icons/')) {
        return `\0fiip-test-icon:${id}`
      }
      return null
    },
    load(id) {
      if (!id.startsWith('\0fiip-test-icon:')) {
        return null
      }
      return `
        import React from 'react';
        export default function FiipIconMock(props) {
          return React.createElement('svg', {
            viewBox: '0 0 24 24',
            focusable: 'false',
            'aria-hidden': props['aria-label'] ? undefined : true,
            ...props,
          });
        }
      `
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    testIconMockPlugin(),
    react(),
    Icons({
      compiler: 'jsx',
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
