import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { nodePrefix } from '../nodePrefix.js';

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

ruleTester.run('require-node-prefix', nodePrefix, {
  valid: [
    {
      code: `import fs from 'node:fs';`,
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
    {
      code: `import fs from 'fs';`,
      filename: FILE_A,
      errors: [{ messageId: 'missingNodePrefix' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
      output: `import fs from 'node:fs';`,
    },
    {
      // Make sure quote style is retained
      code: `import fs from "fs";`,
      filename: FILE_A,
      errors: [{ messageId: 'missingNodePrefix' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
      output: `import fs from "node:fs";`,
    },
  ],
});
