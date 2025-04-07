import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMissingImports } from '../missing.js';
import { join } from 'node:path';
import { getDirname } from 'cross-dirname';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');

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

ruleTester.run('no-missing-exports', noMissingImports, {
  valid: [
    {
      code: ``,
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
      code: `import { b } from './b'`,
      filename: FILE_A,
      errors: [{ messageId: 'noMissingImports' }],
      settings: {
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
