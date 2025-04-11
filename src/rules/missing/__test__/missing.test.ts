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
      code: `import * as b from './b'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import * as tf from 'type-fest'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export * from 'type-fest'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],

  invalid: [
    {
      code: `import { unknown } from './b'`,
      filename: FILE_A,
      errors: [{ messageId: 'noMissingImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export { SourceCode } from './c';`,
      filename: FILE_A,
      errors: [{ messageId: 'noMissingImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import { unknown } from 'unknown'`,
      filename: FILE_A,
      errors: [{ messageId: 'noTransientDependencies' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
