import { join } from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import { defineConfig } from 'eslint/config';
import jest from 'eslint-plugin-jest';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import importIntegrityPlugin from './dist/plugin.js';

const ROOT_DIR = import.meta.dirname;

export default defineConfig([
  includeIgnoreFile(join(ROOT_DIR, '.gitignore')),
  globalIgnores([
    'src/**/__test__/**/project/**/*',
    'jest.config.ts',
    'oxlint.config.ts',
  ]),
  {
    files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
    languageOptions: {
      globals: globals.node,
    },
    plugins: { js, 'simple-import-sort': simpleImportSort },
    extends: ['js/recommended'],
    rules: {
      'object-shorthand': 'error',
      'simple-import-sort/imports': 'error',
      eqeqeq: 'error',

      // Handled by TypeScript eslint
      'no-unused-vars': 'off',
    },
    settings: {
      'import-integrity': {
        packageRootDir: import.meta.dirname,
        debugLogging: true,
        externallyImportedFiles: [
          'docs/.vitepress/config.mjs',
          'docs/.vitepress/theme/index.js',
        ],
      },
    },
  },

  importIntegrityPlugin.configs.recommended,

  ...tseslint.configs.strictTypeChecked.map((r) =>
    r.name === 'typescript-eslint/strict-type-checked'
      ? {
          ...r,
          files: ['**/*.{ts,tsx,mts}'],
        }
      : r
  ),
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: ROOT_DIR,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',

      // This rules doesn't make sense given that no erasable types is enabled
      // that prevents us from using enums
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    ...jest.configs['flat/recommended'],
  },
  {
    // disable type-aware linting on JS files
    files: ['**/*..jsx,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  eslintPluginPrettierRecommended,
]);
