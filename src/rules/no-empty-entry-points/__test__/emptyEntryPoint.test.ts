import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { _testOnlyResetPackageInfo } from '../../../module/module.js';
import { _testOnlyResetAllSettings } from '../../../settings/settings.js';
import { getRelativePathFromRoot } from '../../../util/files.js';
import { noEmptyEntryPoints } from '../rule.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');
const FILE_INDEX = join(TEST_PACKAGE_DIR, 'index.ts');
const FILE_INTERNAL = join(TEST_PACKAGE_DIR, 'internal.ts');
const FILE_EMPTY = join(TEST_PACKAGE_DIR, 'empty.ts');
const FILE_SOMETHING_CONFIG = join(TEST_PACKAGE_DIR, 'something.config.ts');

const FILE_INDEX_ENTRY = getRelativePathFromRoot(TEST_PACKAGE_DIR, FILE_INDEX);
const FILE_SOMETHING_CONFIG_ENTRY = getRelativePathFromRoot(
  TEST_PACKAGE_DIR,
  FILE_SOMETHING_CONFIG
);

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

ruleTester.run('no-empty-entry-points', noEmptyEntryPoints, {
  valid: [
    // Entry point file with a named export
    {
      code: `export const foo = 10;`,
      filename: FILE_INDEX,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
        },
      },
    },
    // Entry point file with a named barrel reexport
    {
      code: `export * as internal from './internal';`,
      filename: FILE_INDEX,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
        },
      },
    },
    // Entry point file with a single reexport
    {
      code: `export { foo } from './internal';`,
      filename: FILE_INDEX,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: { '.': `./${FILE_INDEX_ENTRY}` },
        },
      },
    },
    // Externally imported file with a named export
    {
      code: `export const foo = 10;`,
      filename: FILE_INDEX,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          externallyImportedFiles: [FILE_INDEX_ENTRY],
        },
      },
    },
    // A file that is neither an entry point nor externally imported, with no
    // exports: rule should not fire
    {
      code: ``,
      filename: FILE_INTERNAL,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // A *.config.* file with no exports: rule should not fire even though
    // config files are auto-treated as externally imported
    {
      code: ``,
      filename: FILE_SOMETHING_CONFIG,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          externallyImportedFiles: [FILE_SOMETHING_CONFIG_ENTRY],
        },
      },
    },
  ],

  invalid: [
    // Entry point file with no exports
    {
      code: ``,
      filename: FILE_EMPTY,
      errors: [{ messageId: 'noEmptyEntryPoints' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: {
            '.': `./${getRelativePathFromRoot(TEST_PACKAGE_DIR, FILE_EMPTY)}`,
          },
        },
      },
    },
    // Externally imported file with no exports
    {
      code: ``,
      filename: FILE_EMPTY,
      errors: [{ messageId: 'noEmptyExternallyImportedFiles' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          externallyImportedFiles: [
            getRelativePathFromRoot(TEST_PACKAGE_DIR, FILE_EMPTY),
          ],
        },
      },
    },
  ],
});
