import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { noTestOnlyImports } from '../rule.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'a.ts');
const FILE_B = join(TEST_PACKAGE_DIR, 'b.ts');
const FILE_C_TEST = join(TEST_PACKAGE_DIR, '__custom_test__', 'c-test.ts');
const FILE_D_DTS = join(TEST_PACKAGE_DIR, 'd.d.ts');
const FILE_E = join(TEST_PACKAGE_DIR, 'e.ts');
const FILE_G = join(TEST_PACKAGE_DIR, 'g.ts');
const FILE_H = join(TEST_PACKAGE_DIR, 'h.ts');

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: [
          '*.ts*',
          '__custom_test__/*.ts*',
          '__test__/*.ts*',
        ],
      },
      tsconfigRootDir: TEST_PACKAGE_DIR,
    },
  },
});

ruleTester.run('no-test-only-imports', noTestOnlyImports, {
  valid: [
    {
      code: `export const a1 = 10;
export const a2 = 10;
`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: readFileSync(FILE_B, 'utf8'),
      filename: FILE_B,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: { '.': './f.ts' },
        },
      },
    },
    {
      code: readFileSync(FILE_D_DTS, 'utf8'),
      filename: FILE_D_DTS,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: readFileSync(FILE_E, 'utf8'),
      filename: FILE_E,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          entryPointFiles: { '.': './e.ts' },
        },
      },
    },
    // __custom_test__ is added to testFilePatterns, so c-test.ts is a test file
    // and its exports only being used by other test files is valid
    {
      code: readFileSync(FILE_C_TEST, 'utf8'),
      filename: FILE_C_TEST,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
          testFilePatterns: ['__custom_test__'],
        },
      },
    },
    // g.ts exports a type that is only imported by a test file. Type exports
    // are exempt from this rule, so this is valid.
    {
      code: readFileSync(FILE_G, 'utf8'),
      filename: FILE_G,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // h.ts exports two `_testOnly`-prefixed values: one only imported by a test
    // file, one not imported at all. Both are exempt from this rule because of
    // the prefix.
    {
      code: readFileSync(FILE_H, 'utf8'),
      filename: FILE_H,
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
      code: `export const a1 = 10;
    export const a2 = 10;
    // This one is only imported in tests, thus a lint error
    export const a3 = 10;
    `,
      filename: FILE_A,
      errors: [{ messageId: 'noTestOnlyImports' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // __custom_test__ is NOT in testFilePatterns, so c-test.ts is a prod file
    // and its exports only being used by test files is an error
    {
      code: readFileSync(FILE_C_TEST, 'utf8'),
      filename: FILE_C_TEST,
      errors: [{ messageId: 'noTestOnlyImports' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
