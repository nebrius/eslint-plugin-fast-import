import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { consistentFileExtensions } from '../extension.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');

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

ruleTester.run('consistent-file-extensions', consistentFileExtensions, {
  valid: [
    {
      code: `import { a } from '@/a.ts';
import { b } from './b.js';
`,
      filename: FILE_C,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@/*': './*',
          },
          mode: 'fix',
        },
      },
    },
    {
      code: `import { a } from '@/a';
import { b } from './b';
`,
      filename: FILE_C,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@/*': './*',
          },
          mode: 'fix',
        },
      },
      options: [{ mode: 'never' }],
    },
  ],

  invalid: [
    {
      code: `import { a } from '@/a';
import { b } from './b';
`,
      filename: FILE_C,
      errors: [
        { messageId: 'missingExtension' },
        { messageId: 'missingExtension' },
      ],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@/*': './*',
          },
          mode: 'fix',
        },
      },
    },
    {
      code: `import { a } from '@/a.ts';
import { b } from './b.js';
`,
      filename: FILE_C,
      errors: [{ messageId: 'incorrectExtension' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@/*': './*',
          },
          mode: 'fix',
        },
      },
      options: [{ forceTsExtension: true }],
    },
    {
      code: `import { a } from '@/a.ts';
import { b } from './b.ts';
`,
      filename: FILE_C,
      errors: [
        { messageId: 'extraExtension' },
        { messageId: 'extraExtension' },
      ],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@/*': './*',
          },
          mode: 'fix',
        },
      },
      options: [{ mode: 'never' }],
    },
  ],
});
