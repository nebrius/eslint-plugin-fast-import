import tsParser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';

import plugin from './dist/plugin.js';

export default tseslint.config({
  files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/no-cycle': 'error',
    'fast-import/no-unused-exports': 'error',
    'fast-import/no-missing-imports': 'error',
  },
});
