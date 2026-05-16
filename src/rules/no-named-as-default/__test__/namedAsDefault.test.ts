import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noNamedAsDefault } from '../rule.js';

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

ruleTester.run('no-named-as-default', noNamedAsDefault, {
  valid: [
    {
      code: `import { b } from './b';
import bDefault from './b';`,
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
      code: `import { b as alias } from './b';
import b from './b';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNamedAsDefault' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export { default as b } from './b';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNamedAsDefault' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
