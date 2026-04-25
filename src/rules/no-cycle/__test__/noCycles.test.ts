import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { _resetCycleMap, noCycle } from '../rule.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'a.ts');

beforeEach(() => {
  _resetCycleMap();
});

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

ruleTester.run('no-cycle', noCycle, {
  valid: [
    {
      code: `export const a = 10;`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],

  invalid: [
    {
      code: `import { c } from './c';

export const a = 10;

console.log(c);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noCycles' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export * from './c';

export const a = 10;

console.log(c);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noCycles' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import { a } from './a';

export const a = 10;`,
      filename: FILE_A,
      errors: [{ messageId: 'noCycles' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
