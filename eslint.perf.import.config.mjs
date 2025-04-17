import tsParser from '@typescript-eslint/parser';
import * as pluginImport from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['**/*.{js,mjs,jsx,ts,tsx,mts}'],
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  plugins: {
    import: pluginImport,
  },
  rules: {
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
  },
});
