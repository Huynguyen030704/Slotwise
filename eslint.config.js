import js from '@eslint/js';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  { ignores: ['docs/prototype/**', 'coverage/**', 'node_modules/**', '**/dist/**'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    plugins: { jsdoc },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-type': 'error',
    },
  },
];
