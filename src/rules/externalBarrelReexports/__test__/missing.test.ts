import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExternalBarrelReexports } from '../externalBarrelReexports.js';
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

ruleTester.run('no-external-barrel-reexports', noExternalBarrelReexports, {
  valid: [
    {
      code: ``,
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
      code: `export * from 'node:path';`,
      filename: FILE_A,
      errors: [{ messageId: 'noExternalBarrelReexports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export * from 'express';`,
      filename: FILE_A,
      errors: [{ messageId: 'noExternalBarrelReexports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
