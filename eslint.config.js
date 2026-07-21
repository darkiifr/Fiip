import js from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import promise from 'eslint-plugin-promise'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  { 
    ignores: [
      'dist/**',
      '**/dist/**',
      'coverage/**',
      '**/coverage/**',
      '.vite/**',
      '.agents/**',
      '.github/skills/**',
      '**/node_modules/**',
      'src-tauri/target/**',
      'DA/**',
      'public/**',
      'Mobile/**',
      'PublicLinksite/**'
    ] 
  },
  {
    files: ['sellauth-theme/**/*.js'],
    languageOptions: {
      globals: {
        Alpine: 'readonly',
        Choices: 'readonly',
        Cookies: 'readonly',
        $: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { 
      react: { version: 'detect' },
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx']
        }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      'import': importPlugin,
      'promise': promise,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      
      'react/jsx-no-target-blank': 'error',
      'react-refresh/only-export-components': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^React$', argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'curly': ['warn', 'all'],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/media-has-caption': 'off',
      
      // Import rules
      'import/order': ['warn', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
      }],
      'import/no-unresolved': 'off', // Deno and Vite handle this differently
      
      // Promise rules
      'promise/always-return': 'off',
      'promise/no-return-wrap': 'off',
      'promise/catch-or-return': 'off',
    },
  },
]
