import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEntryPointImports } from '../entryPoint.js';
import { join } from 'node:path';
import { getDirname } from 'cross-dirname';
import { readFileSync } from 'node:fs';
import { _resetSettings } from '../../../settings/settings.js';
import { _resetProjectInfo } from '../../../module/module.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_A_CONTENTS = readFileSync(FILE_A, 'utf-8');

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
      code: FILE_A_CONTENTS,
      filename: FILE_A,
      settings: {
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
  invalid: [
    {
      code: FILE_A_CONTENTS,
      filename: FILE_A,
      errors: [{ messageId: 'noEntryPointImports' }],
      settings: {
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
          entryPoints: [
            {
              file: 'a.ts',
              symbol: 'a',
            },
          ],
        },
      },
    },
  ],
});
