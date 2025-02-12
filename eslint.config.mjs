import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import jest from 'eslint-plugin-jest';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    settings: {
      'import/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
        }),
      ],
    },
    languageOptions: {
      globals: globals.node,
    }
  },
  eslintPluginPrettierRecommended,
  ...tseslint.config(
    tseslint.configs.strictTypeChecked,
    tseslint.configs.strictTypeChecked,
    {
      files: ['src/**/*.{ts,tsx}'],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
      },
    }
  ),
  {
    files: ['**/*.test.ts'],
    ...jest.configs['flat/recommended']
  },
  ...compat.extends('eslint:recommended'),
];
