import globals from 'globals';
import { globalIgnores } from 'eslint/config';
import importIntegrity from '../../../../../dist/plugin.js';

export default [
  {
    settings: {
      'import-integrity': {
        debugLogging: true,
      },
    },
    files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  globalIgnores(['./eslint.config.mjs']),
  importIntegrity.configs.recommended,
];
