import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noNodeBuiltins } from '../rule.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'a.ts');

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

ruleTester.run('no-node-builtins', noNodeBuiltins, {
  valid: [
    // First-party import
    {
      code: `import { foo } from './b';`,
      filename: FILE_A,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // Third-party import
    {
      code: `import lodash from 'lodash';`,
      filename: FILE_A,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
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
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
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
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
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
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
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
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
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
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // Side-effect import of builtin
    {
      code: `import 'node:fs';`,
      filename: FILE_A,
      errors: [{ messageId: 'noNodeBuiltins' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
