import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEntryPointImportsImports } from '..';
import { join } from 'node:path';
import { getDirname } from 'cross-dirname';
import { readFileSync } from 'node:fs';
import { _resetSettings } from '../../../settings/settings';
import { _resetProjectInfo } from '../../../module';

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

ruleTester.run('no-entry-point-imports', noEntryPointImportsImports, {
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
