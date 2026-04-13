module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-native', 'react-hooks'],
  extends: [
    '@react-native',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    'react-native/react-native': true,
    jest: true,
  },
  globals: {
    jest: 'readonly',
    __dirname: 'readonly',
  },
  rules: {
    'react-native/no-inline-styles': 'warn',
    'react-native/no-unused-styles': 'error',
    'react-native/no-color-literals': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/prop-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off', // allow @ts-ignore Since some RN libs need it
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'warn'
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
