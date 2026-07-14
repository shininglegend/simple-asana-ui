import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/', 'node_modules/', '.wrangler/'],
  },
  js.configs.recommended,
  {
    // Front-end code runs in the browser
    files: ['public/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // Pages Functions run on the Workers runtime (service-worker-like globals)
    files: ['functions/**/*.js'],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
