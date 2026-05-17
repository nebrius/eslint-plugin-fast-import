import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { _testOnlyResetPackageInfo } from '../../../module/module.js';
import { _testOnlyResetAllSettings } from '../../../settings/settings.js';
import { noTestImportsInProd } from '../rule.js';

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

beforeEach(() => {
  _testOnlyResetAllSettings();
  _testOnlyResetPackageInfo();
});

ruleTester.run('no-test-imports-in-prod', noTestImportsInProd, {
  valid: [
    {
      code: ``,
      filename: FILE_A,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // testing/e.ts lives in a directory whose name contains "test" but is
    // neither `test/` nor `tests/`. The default patterns are anchored, so it
    // is treated as a production file and importing it from production code
    // is allowed.
    {
      code: `import { eHelper } from './testing/e';

console.log(eHelper);
`,
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
    {
      code: `import { bTest } from './__test__/b';

console.log(bTest);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noTestImports' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // c.ts is a production file that exposes a `_testOnly`-prefixed export.
    // A production caller importing it should be flagged even though the
    // resolved file is not itself a test file.
    {
      code: `import { _testOnlyHelper } from './c';

console.log(_testOnlyHelper);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noTestImports' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    {
      code: `import './__test__/b';\n`,
      filename: FILE_A,
      errors: [{ messageId: 'noTestImports' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // test/b.ts is recognized as a test file via the `/test/` default pattern.
    {
      code: `import { bTest } from './test/b';

console.log(bTest);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noTestImports' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
    // tests/d.ts is recognized as a test file via the `/tests/` default
    // pattern (plural).
    {
      code: `import { dTest } from './tests/d';

console.log(dTest);
`,
      filename: FILE_A,
      errors: [{ messageId: 'noTestImports' }],
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
          mode: 'fix',
        },
      },
    },
  ],
});
