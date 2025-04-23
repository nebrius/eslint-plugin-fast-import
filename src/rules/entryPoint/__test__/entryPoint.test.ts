import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { _resetProjectInfo } from '../../../module/module.js';
import { _resetSettings } from '../../../settings/settings.js';
import { noEntryPointImports } from '../entryPoint.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_B_CONTENTS = readFileSync(FILE_B, 'utf-8');
const FILE_C_CONTENTS = readFileSync(FILE_C, 'utf-8');

const FILE_A_ENTRY_POINT = FILE_A.replace(TEST_PROJECT_DIR + '/', '');

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
      },
      tsconfigRootDir: TEST_PROJECT_DIR,
    },
  },
});

beforeEach(() => {
  _resetSettings();
  _resetProjectInfo();
});

ruleTester.run('no-entry-point-imports', noEntryPointImports, {
  valid: [
    {
      code: FILE_B_CONTENTS,
      filename: FILE_B,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
    },
    {
      code: FILE_C_CONTENTS,
      filename: FILE_C,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
    },
  ],
  invalid: [
    {
      code: FILE_B_CONTENTS,
      filename: FILE_B,
      errors: [{ messageId: 'noEntryPointImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
          entryPoints: {
            [FILE_A_ENTRY_POINT]: ['a'],
          },
        },
      },
    },
    {
      code: FILE_C_CONTENTS,
      filename: FILE_C,
      errors: [{ messageId: 'noEntryPointImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
          entryPoints: {
            [FILE_A_ENTRY_POINT]: ['a'],
          },
        },
      },
    },
  ],
});
