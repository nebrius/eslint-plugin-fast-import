import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnusedExports } from '..';
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

ruleTester.run('no-unused-exports', noUnusedExports, {
  valid: [
    {
      code: `export const a1 = 10;
export const a2 = 10;
`,
      filename: FILE_A,
      settings: {
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
          debugLogging: true,
        },
      },
    },
  ],

  invalid: [
    {
      code: `export const a1 = 10;
    export const a2 = 10;
    // This one is not imported, thus a lint error
    export const a4 = 10;
    `,
      filename: FILE_A,
      errors: [{ messageId: 'noUnusedExports' }],
      settings: {
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
          debugLogging: true,
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
        'fast-esm': {
          rootDir: TEST_PROJECT_DIR,
          debugLogging: true,
        },
      },
    },
  ],
});
