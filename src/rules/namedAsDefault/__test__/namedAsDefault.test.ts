import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { namedAsDefault } from '../namedAsDefault.js';

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

ruleTester.run('no-named-as-default', namedAsDefault, {
  valid: [
    {
      code: `import { b } from './b';
import bDefault from './b';`,
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
      code: `import { b as alias } from './b';
import b from './b';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNamedAsDefault' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export { default as b } from './b';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNamedAsDefault' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
