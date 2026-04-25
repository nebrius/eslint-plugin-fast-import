import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { _testOnlyResetPackageInfo } from '../../../module/module.js';
import { _testOnlyResetAllSettings } from '../../../settings/settings.js';
import { getRelativePathFromRoot } from '../../../util/files.js';
import { noUnnamedEntryPointExports } from '../rule.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_INDEX = join(TEST_PACKAGE_DIR, 'index.ts');
const FILE_INTERNAL = join(TEST_PACKAGE_DIR, 'internal.ts');

const FILE_INDEX_ENTRY = getRelativePathFromRoot(TEST_PACKAGE_DIR, FILE_INDEX);

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
      },
      tsconfigRootDir: TEST_PACKAGE_DIR,
    },
  },
});

beforeEach(() => {
  _testOnlyResetAllSettings();
  _testOnlyResetPackageInfo();
});

ruleTester.run(
  'no-unnamed-entry-point-exports',
  noUnnamedEntryPointExports,
  {
    valid: [
      // Entry point file (entryPointFiles) with a named barrel reexport
      {
        code: `export * as internal from './internal';`,
        filename: FILE_INDEX,
        settings: {
          'fast-import': {
            packageRootDir: TEST_PACKAGE_DIR,
            mode: 'fix',
            entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
          },
        },
      },
      // Entry point file with explicit named reexports (no barrel)
      {
        code: `export { foo } from './internal';`,
        filename: FILE_INDEX,
        settings: {
          'fast-import': {
            packageRootDir: TEST_PACKAGE_DIR,
            mode: 'fix',
            entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
          },
        },
      },
      // Non-entry-point file with a bare barrel reexport: rule should not fire
      {
        code: `export * from './internal';`,
        filename: FILE_INDEX,
        settings: {
          'fast-import': {
            packageRootDir: TEST_PACKAGE_DIR,
            mode: 'fix',
          },
        },
      },
      // internal.ts is not an entry point, so a bare barrel reexport here is
      // allowed even when index.ts is configured as the entry point
      {
        code: `export * from './internal';`,
        filename: FILE_INTERNAL,
        settings: {
          'fast-import': {
            packageRootDir: TEST_PACKAGE_DIR,
            mode: 'fix',
            entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
          },
        },
      },
      // externallyImportedFiles is intentionally not covered by this rule, so
      // a bare barrel reexport in such a file is allowed
      {
        code: `export * from './internal';`,
        filename: FILE_INDEX,
        settings: {
          'fast-import': {
            packageRootDir: TEST_PACKAGE_DIR,
            mode: 'fix',
            externallyImportedFiles: [FILE_INDEX_ENTRY],
          },
        },
      },
    ],

    invalid: [
      // Bare barrel reexport in an entry point file (entryPointFiles)
      {
        code: `export * from './internal';`,
        filename: FILE_INDEX,
        errors: [{ messageId: 'noUnnamedEntryPointExports' }],
        settings: {
          'fast-import': {
            packageRootDir: TEST_PACKAGE_DIR,
            mode: 'fix',
            entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
          },
        },
      },
      // A named barrel reexport alongside a bare one: only the bare one fires
      {
        code: `export * as internal from './internal';
export * from './internal';`,
        filename: FILE_INDEX,
        errors: [{ messageId: 'noUnnamedEntryPointExports' }],
        settings: {
          'fast-import': {
            packageRootDir: TEST_PACKAGE_DIR,
            mode: 'fix',
            entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
          },
        },
      },
    ],
  }
);
