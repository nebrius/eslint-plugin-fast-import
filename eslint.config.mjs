import { join } from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { getDirname } from 'cross-dirname';
import { globalIgnores } from 'eslint/config';
import jest from 'eslint-plugin-jest';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { recommended } from './dist/plugin.js';

const compat = new FlatCompat({
  baseDirectory: getDirname(),
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default tseslint.config(
  includeIgnoreFile(join(getDirname(), '.gitignore')),
  globalIgnores(['src/**/__test__/**/project/*', 'jest.config.ts']),
  {
    files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  recommended({
    entryPoints: [
      {
        file: 'src/plugin.ts',
        symbols: [
          'default',
          'getESMInfo',
          'registerUpdateListener',
          'isNonTestFile',
          'recommended',
        ],
      },
    ],
    debugLogging: true,
  }),
  eslintPluginPrettierRecommended,
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
        tsconfigRootDir: getDirname(),
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
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
  ...compat.extends('eslint:recommended'),
  {
    rules: {
      'object-shorthand': 'error',

      // Handled by TypeScript eslint
      'no-unused-vars': 'off',
    },
  }
);
