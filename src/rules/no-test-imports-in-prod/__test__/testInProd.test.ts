import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { _resetPackageInfo } from '../../../module/module.js';
import { _resetAllSettings } from '../../../settings/settings.js';
import { noTestImportsInProd } from '../rule.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
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

beforeEach(() => {
  _resetAllSettings();
  _resetPackageInfo();
});

ruleTester.run('no-test-imports-in-prod', noTestImportsInProd, {
  valid: [
    {
      code: ``,
      filename: FILE_A,
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
      code: `import { bTest } from './__test__/b';

console.log(bTest);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noTestImports' }],
      settings: {
        'fast-import': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
