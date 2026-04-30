import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { noUnresolvedImports } from '../rule.js';

// project/package-lock.json is load-bearing: @manypkg uses it to detect this
// fixture as an npm-workspaces monorepo.
const MONOREPO_ROOT_DIR = join(getDirname(), 'project');
const TEST_PACKAGE_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'one');
const FILE_A = join(TEST_PACKAGE_DIR, 'a.ts');
const FILE_D = join(MONOREPO_ROOT_DIR, 'packages', 'two', 'd.ts');

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*', '../two/*.ts*'],
      },
      tsconfigRootDir: TEST_PACKAGE_DIR,
    },
  },
});

ruleTester.run('no-unresolved-exports', noUnresolvedImports, {
  valid: [
    {
      code: `import * as b from './b'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import * as tf from 'type-fest'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import type { JSX } from 'react'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export * from 'type-fest'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      // packages/two is still a known workspace package even without its own
      // fast-import.config.json. With no module specifiers to resolve, this
      // file should stay quiet.
      code: `export const d = 10`,
      filename: FILE_D,
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import { foo } from '@test/two'`,
      filename: FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
  ],

  invalid: [
    {
      code: `import { unknown } from './b'`,
      filename: FILE_A,
      errors: [{ messageId: 'noUnresolvedImports' }],
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export { SourceCode } from './c';`,
      filename: FILE_A,
      errors: [{ messageId: 'noUnresolvedImports' }],
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import React from 'react'`,
      filename: FILE_A,
      errors: [{ messageId: 'noTransientDependencies' }],
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import { unknown } from 'unknown'`,
      filename: FILE_A,
      errors: [{ messageId: 'noTransientDependencies' }],
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      // packages/two is still linted even without a package-local config
      // file, so unresolved specifiers from that workspace package must
      // still report.
      code: `export * from './unknown'`,
      filename: FILE_D,
      errors: [{ messageId: 'noUnresolvedImports' }],
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import * as unknown from './unknown'`,
      filename: FILE_A,
      errors: [{ messageId: 'noUnresolvedImports' }],
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `export * from './unknown'`,
      filename: FILE_A,
      errors: [{ messageId: 'noUnresolvedImports' }],
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_ROOT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
