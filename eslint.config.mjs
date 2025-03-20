import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import { getDirname } from 'cross-dirname';

const compat = new FlatCompat({
  baseDirectory: getDirname(),
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
          tsconfigRootDir: getDirname(),
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
  {
    rules: {
      // Handled by typescript eslint
      'no-unused-vars': 'off'
    }
  },
];
