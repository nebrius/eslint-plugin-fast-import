import { RuleTester } from '@typescript-eslint/rule-tester';
import { noCircularImports, _resetCircularMap } from '../circular.js';
import { join } from 'node:path';
import { getDirname } from 'cross-dirname';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');

beforeEach(() => {
  _resetCircularMap();
});

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

ruleTester.run('no-circular-exports', noCircularImports, {
  valid: [
    {
      code: `export const a = 10;`,
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
      code: `import { c } from './c';

export const a = 10;

console.log(c);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noCircularImports' }],
      settings: {
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
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
      errors: [{ messageId: 'noCircularImports' }],
      settings: {
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
