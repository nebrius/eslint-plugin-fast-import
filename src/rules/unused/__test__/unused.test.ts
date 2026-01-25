import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { noUnusedExports } from '../unused.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C_TEST = join(TEST_PROJECT_DIR, '__fixture__', 'c-test.ts');
const FILE_D_DTS = join(TEST_PROJECT_DIR, 'd.d.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.ts');

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*', '__fixture__/*.ts*', '__test__/*.ts*'],
      },
      tsconfigRootDir: TEST_PROJECT_DIR,
    },
  },
});

ruleTester.run('no-unused-exports', noUnusedExports, {
  valid: [
    {
      code: `export const a1 = 10;
export const a2 = 10;
`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export function a1(arg: number): void;
export function a1(arg: string): void;
export function a1(arg: number | string): void {
  console.log(arg);
}
`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: readFileSync(FILE_B, 'utf8'),
      filename: FILE_B,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
          entryPoints: {
            'f.ts': ['a2'],
          },
        },
      },
    },
    {
      code: readFileSync(FILE_D_DTS, 'utf8'),
      filename: FILE_D_DTS,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: readFileSync(FILE_E, 'utf8'),
      filename: FILE_E,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
          entryPoints: {
            'e.ts': ['e'],
          },
        },
      },
    },
    // __fixture__ is added to testFilePatterns, so c-test.ts is a test file
    // and its exports only being used by other test files is valid
    {
      code: readFileSync(FILE_C_TEST, 'utf8'),
      filename: FILE_C_TEST,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
          testFilePatterns: ['__fixture__'],
        },
      },
    },
  ],

  invalid: [
    {
      code: `export const a1 = 10;
    export const a2 = 10;
    // This one is not imported, thus a lint error
    export default 10;
    `,
      filename: FILE_A,
      errors: [{ messageId: 'noUnusedExports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export const a1 = 10;
    export const a2 = 10;
    // This one is only imported in tests, thus a lint error
    export const a3 = 10;
    `,
      filename: FILE_A,
      errors: [{ messageId: 'noTestOnlyImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export const a3 = 10;`,
      filename: FILE_A,
      options: [
        {
          allowNonTestTypeExports: false,
        },
      ],
      errors: [{ messageId: 'noTestOnlyImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    // __fixture__ is NOT in testFilePatterns, so c-test.ts is a prod file
    // and its exports only being used by test files is an error
    {
      code: readFileSync(FILE_C_TEST, 'utf8'),
      filename: FILE_C_TEST,
      errors: [{ messageId: 'noTestOnlyImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
