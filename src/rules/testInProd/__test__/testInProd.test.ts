import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { _resetProjectInfo } from '../../../module/module.js';
import { resetSettings } from '../../../settings/settings.js';
import { noTestImportsInProd } from '../testInProd.js';

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

beforeEach(() => {
  resetSettings();
  _resetProjectInfo();
});

ruleTester.run('no-test-imports-in-prod', noTestImportsInProd, {
  valid: [
    {
      code: ``,
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
      code: `import { bTest } from './__test__/b';

console.log(bTest);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noTestImports' }],
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
