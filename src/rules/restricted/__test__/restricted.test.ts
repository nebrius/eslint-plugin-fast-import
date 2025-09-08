import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { _resetProjectInfo } from '../../../module/module.js';
import { resetSettings } from '../../../settings/settings.js';
import { noRestrictedImports } from '../restricted.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd/d.ts');
const FILE_E2 = join(TEST_PROJECT_DIR, 'e/e2.ts');

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*', 'd/*.ts*', 'e/*.ts*'],
      },
      tsconfigRootDir: TEST_PROJECT_DIR,
    },
  },
});

beforeEach(() => {
  resetSettings();
  _resetProjectInfo();
});

ruleTester.run('no-restricted-imports', noRestrictedImports, {
  valid: [
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: './b.ts',
              allowed: ['./a.ts', './c.ts'],
            },
            {
              type: 'third-party',
              moduleSpecifier: 'node:fs',
              allowed: ['./a.ts', './c.ts'],
            },
          ],
        },
      ],
    },
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /b.ts$/,
              allowed: [/a.ts$/, /c.ts$/],
            },
            {
              type: 'third-party',
              moduleSpecifier: /^node:*/,
              allowed: [/a.ts$/, /c.ts$/],
            },
          ],
        },
      ],
    },
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: './b.ts',
              denied: ['./b.ts', './c.ts'],
            },
            {
              type: 'third-party',
              moduleSpecifier: 'node:fs',
              denied: ['./b.ts', './c.ts'],
            },
          ],
        },
      ],
    },
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /b.ts$/,
              denied: [/b.ts$/, /c.ts$/],
            },
            {
              type: 'third-party',
              moduleSpecifier: /^node:*/,
              denied: [/b.ts$/, /c.ts$/],
            },
          ],
        },
      ],
    },
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /b.ts$/,
              denied: [/b.ts$/, /c.ts$/],
            },
            {
              type: 'third-party',
              moduleSpecifier: /^node:*/,
              denied: [/b.ts$/, /c.ts$/],
            },
          ],
        },
      ],
    },
    {
      code: `import { e1 } from './e1';`,
      filename: FILE_E2,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /(.+?)\/[a-zA-Z0-9-_]+\.ts$/,
              allowed: [/$1\/[a-zA-Z0-9-_]+\.ts$/],
            },
          ],
        },
      ],
    },
    {
      code: `import { e1 } from './e1';`,
      filename: FILE_E2,
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /(.+?)\/[a-zA-Z0-9-_]+\.ts$/,
              denied: [/d\/[a-zA-Z0-9-_]+\.ts$/],
            },
          ],
        },
      ],
    },
  ],
  invalid: [
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      errors: [
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is denied from importing ./b` },
        },
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is denied from importing node:fs` },
        },
      ],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: './b.ts',
              denied: ['./a.ts', './c.ts'],
            },
            {
              type: 'third-party',
              moduleSpecifier: 'node:fs',
              denied: ['./a.ts', './c.ts'],
            },
          ],
        },
      ],
    },
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      errors: [
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is denied from importing ./b` },
        },
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is denied from importing node:fs` },
        },
      ],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /b.ts$/,
              denied: [/a.ts$/, /c.ts$/],
            },
            {
              type: 'third-party',
              moduleSpecifier: /^node:*/,
              denied: [/a.ts$/, /c.ts$/],
            },
          ],
        },
      ],
    },
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      errors: [
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is not allowed to import ./b` },
        },
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is not allowed to import node:fs` },
        },
      ],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: './b.ts',
              allowed: ['./b.ts', './c.ts'],
            },
            {
              type: 'third-party',
              moduleSpecifier: 'node:fs',
              allowed: ['./b.ts', './c.ts'],
            },
          ],
        },
      ],
    },
    {
      code: `import { b } from './b';\nimport { c } from './c';\nimport { fs } from 'node:fs';`,
      filename: FILE_A,
      errors: [
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is not allowed to import ./b` },
        },
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_A} is not allowed to import node:fs` },
        },
      ],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /b.ts$/,
              allowed: [/b.ts$/, /c.ts$/],
            },
            {
              type: 'third-party',
              moduleSpecifier: /^node:*/,
              allowed: [/b.ts$/, /c.ts$/],
            },
          ],
        },
      ],
    },
    {
      code: `import { e1 } from '../e/e1';`,
      filename: FILE_D,
      errors: [
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_D} is not allowed to import ../e/e1` },
        },
      ],
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /(.+?)\/[a-zA-Z0-9-_]+\.ts$/,
              allowed: [/$1\/[a-zA-Z0-9-_]+\.ts$/],
            },
          ],
        },
      ],
    },
    {
      code: `import { e1 } from '../e/e1';`,
      filename: FILE_D,
      errors: [
        {
          messageId: 'restrictedImport',
          data: { message: `${FILE_D} is denied from importing ../e/e1` },
        },
      ],
      settings: { 'fast-import': { rootDir: TEST_PROJECT_DIR, mode: 'fix' } },
      options: [
        {
          rules: [
            {
              type: 'first-party',
              filepath: /(.+?)\/[a-zA-Z0-9-_]+\.ts$/,
              denied: [/d\/[a-zA-Z0-9-_]+\.ts$/],
            },
          ],
        },
      ],
    },
  ],
});
