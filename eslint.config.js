import js from '@eslint/js';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['.claude/**', 'docs/prototype/**', 'coverage/**', 'node_modules/**', '**/dist/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser, __DEV__: 'readonly', Deno: 'readonly' },
    },
    plugins: { jsdoc, react },
    rules: {
      'react/jsx-uses-vars': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-type': 'error',
    },
  },
];
