import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import { getDirname } from 'cross-dirname';
import { includeIgnoreFile } from '@eslint/compat';
import { join } from 'node:path';
import fastEsm from './dist/index.js';

const compat = new FlatCompat({
  baseDirectory: getDirname(),
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  includeIgnoreFile(join(getDirname(), '.gitignore')),
  {
    settings: {
      'import/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
        }),
      ],
      'fast-esm': {
        entryPoints: [
          {
            file: 'index.ts',
            symbol: 'default'
          },
        ],
        debugLogging: true
      },
    },
    files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
    languageOptions: {
      globals: globals.node,
    },
    plugins: { 'fast-esm': fastEsm.default },
    rules: {
      'fast-esm/no-unused-exports': 'error',
      'fast-esm/no-circular-imports': 'error',
    },
  },

  eslintPluginPrettierRecommended,
  ...tseslint.config(tseslint.configs.strictTypeChecked, {
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
  }),
  {
    files: ['**/*.test.ts'],
    ...jest.configs['flat/recommended'],
  },
  ...compat.extends('eslint:recommended'),
  {
    rules: {
      'object-shorthand': "error",

      // Handled by TypeScript eslint
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/module/__test__/projectInfo/**/*'],
    rules: {
      'fast-esm/no-unused-exports': 'off',
    },
  },
  {
    files: ['src/rules/circular/__test__/**/*'],
    rules: {
      'fast-esm/no-circular-exports': 'off',
    },
  },
];
