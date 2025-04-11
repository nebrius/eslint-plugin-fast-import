import globals from 'globals';
import { globalIgnores } from 'eslint/config';
import fastEsm from '../../../../../dist/plugin.js';

export default [
  {
    settings: {
      'fast-import': {
        debugLogging: true,
      },
    },
    files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  globalIgnores(['./eslint.config.mjs']),
  fastEsm.configs.recommended,
]
