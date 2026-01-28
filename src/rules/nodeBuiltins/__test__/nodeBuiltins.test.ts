import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { noNodeBuiltins } from '../nodeBuiltins.js';

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

ruleTester.run('no-node-builtins', noNodeBuiltins, {
  valid: [
    // First-party import
    {
      code: `import { foo } from './b';`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    // Third-party import
    {
      code: `import lodash from 'lodash';`,
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
    // Builtin with node: prefix
    {
      code: `import fs from 'node:fs';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNodeBuiltins' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    // Builtin without node: prefix
    {
      code: `import fs from 'fs';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNodeBuiltins' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    // Named import from builtin
    {
      code: `import { join } from 'path';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNodeBuiltins' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    // Barrel import from builtin
    {
      code: `import * as path from 'node:path';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNodeBuiltins' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
    // Reexport from builtin
    {
      code: `export { readFile } from 'node:fs';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNodeBuiltins' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
