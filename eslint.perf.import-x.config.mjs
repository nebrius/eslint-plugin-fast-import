import tsParser from '@typescript-eslint/parser';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import * as pluginImportX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    'import-x/resolver-next': [
      createTypeScriptImportResolver({
        extensions: ['.ts', '.tsx', '.js'],
        extensionAlias: {
          '.js': ['.ts', '.js'],
        },
        project: '.',
      }),
    ],
  },
  plugins: {
    'import-x': pluginImportX,
  },
  rules: {
    'import-x/no-cycle': 'error',
    'import-x/no-unused-modules': 'error',
    'import-x/no-unresolved': 'error',
  },
});
