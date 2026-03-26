import { all } from './dist/plugin.js';

const ROOT_DIR = import.meta.dirname;

// Get fast-import rules and settings from the plugin helper,
// same as eslint.config.mjs uses all(ROOT_DIR)
const fastImportConfig = all(ROOT_DIR);

export default {
  plugins: ['typescript', 'jest'],
  categories: {
    correctness: 'error',
  },
  options: {
    typeAware: true,
  },
  jsPlugins: [
    { name: 'fast-import', specifier: './dist/plugin.js' },
    'eslint-plugin-simple-import-sort',
  ],
  ignorePatterns: [
    'dist',
    'coverage',
    'node_modules',
    'src/**/__test__/**/project/**/*',
    'jest.config.ts',
  ],
  overrides: [
    {
      files: ['**/*.test.ts'],
      rules: {
        'jest/expect-expect': 'error',
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/valid-expect': 'error',
      },
    },
  ],
  rules: {
    // Core ESLint rules matching eslint.config.mjs
    'eslint/object-shorthand': 'error',
    'simple-import-sort/imports': 'error',

    // TypeScript rules matching eslint.config.mjs
    'typescript/consistent-type-imports': 'error',
    'typescript/no-unsafe-enum-comparison': 'off',

    // fast-import rules from the all() helper
    ...fastImportConfig.rules,
  },
  settings: fastImportConfig.settings,
};
