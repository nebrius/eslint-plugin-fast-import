import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noExternalBarrelReexports } from '../rule.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'a.ts');

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

ruleTester.run('no-external-barrel-reexports', noExternalBarrelReexports, {
  valid: [
    {
      code: ``,
      filename: FILE_A,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
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
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export * from 'express';`,
      filename: FILE_A,
      errors: [{ messageId: 'noExternalBarrelReexports' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
