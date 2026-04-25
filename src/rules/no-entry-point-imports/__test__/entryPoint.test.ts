import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { _testOnlyResetPackageInfo } from '../../../module/module.js';
import { _testOnlyResetAllSettings } from '../../../settings/settings.js';
import { getRelativePathFromRoot } from '../../../util/files.js';
import { noEntryPointImports } from '../rule.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'a.ts');
const FILE_B = join(TEST_PACKAGE_DIR, 'b.ts');
const FILE_C = join(TEST_PACKAGE_DIR, 'c.ts');
const FILE_B_CONTENTS = readFileSync(FILE_B, 'utf-8');
const FILE_C_CONTENTS = readFileSync(FILE_C, 'utf-8');

const FILE_A_ENTRY_POINT = getRelativePathFromRoot(TEST_PACKAGE_DIR, FILE_A);

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

ruleTester.run('no-entry-point-imports', noEntryPointImports, {
  valid: [
    {
      code: FILE_B_CONTENTS,
      filename: FILE_B,
      settings: {
        'fast-import': { packageRootDir: TEST_PACKAGE_DIR, mode: 'fix' },
      },
    },
    {
      code: FILE_C_CONTENTS,
      filename: FILE_C,
      settings: {
        'fast-import': { packageRootDir: TEST_PACKAGE_DIR, mode: 'fix' },
      },
    },
  ],
  invalid: [
    {
      code: FILE_B_CONTENTS,
      filename: FILE_B,
      errors: [{ messageId: 'noEntryPointImports' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: { '.': `./${FILE_A_ENTRY_POINT}` },
        },
      },
    },
    {
      code: FILE_B_CONTENTS,
      filename: FILE_B,
      errors: [{ messageId: 'noEntryPointImports' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          externallyImportedFiles: [FILE_A_ENTRY_POINT],
        },
      },
    },
    {
      code: FILE_C_CONTENTS,
      filename: FILE_C,
      errors: [{ messageId: 'noEntryPointImports' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: { '.': `./${FILE_A_ENTRY_POINT}` },
        },
      },
    },
    {
      code: FILE_C_CONTENTS,
      filename: FILE_C,
      errors: [{ messageId: 'noEntryPointImports' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          externallyImportedFiles: [FILE_A_ENTRY_POINT],
        },
      },
    },
  ],
});
