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

export default tseslint.config(
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
            symbol: 'default',
          },
        ],
        debugLogging: true,
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
      'fast-esm/no-entry-point-imports': 'error',
      'fast-esm/no-missing-imports': 'error',
    },
  },

  eslintPluginPrettierRecommended,
  tseslint.configs.strictTypeChecked,
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
    files: ['**/*.test.ts'],
    ...jest.configs['flat/recommended'],
  },
  {
    // disable type-aware linting on JS files
    files: ['**/*.{js,jsx,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  ...compat.extends('eslint:recommended'),
  {
    rules: {
      'object-shorthand': 'error',

      // Handled by TypeScript eslint
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/**/__test__/projectInfo/**/*'],
    rules: {
      'fast-esm/no-unused-exports': 'off',
      'fast-esm/no-missing-imports': 'off',
      'fast-esm/no-circular-exports': 'off',
    },
  }
);
