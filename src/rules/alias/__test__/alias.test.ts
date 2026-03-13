import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { preferAliasImports } from '../alias.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_INDEX = join(TEST_PROJECT_DIR, 'src', 'index.ts');
const FILE_BUTTON = join(TEST_PROJECT_DIR, 'src', 'components', 'Button.ts');
const FILE_LABEL = join(
  TEST_PROJECT_DIR,
  'src',
  'components',
  'internal',
  'Label.ts'
);
const FILE_STANDALONE = join(TEST_PROJECT_DIR, 'standalone.ts');

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: [
          '*.ts*',
          'src/*.ts*',
          'src/components/*.ts*',
          'src/utils/*.ts*',
          'src/components/internal/*.ts*',
        ],
      },
      tsconfigRootDir: TEST_PROJECT_DIR,
    },
  },
});

const WILDCARD_SETTINGS = {
  'fast-import': {
    rootDir: TEST_PROJECT_DIR,
    alias: {
      '@/*': './src/*',
    },
    mode: 'fix',
  },
};

const WILDCARD_AND_FIXED_SETTINGS = {
  'fast-import': {
    rootDir: TEST_PROJECT_DIR,
    alias: {
      '@/*': './src/*',
      '@standalone': './standalone.ts',
    },
    mode: 'fix',
  },
};

// =============================================================================
// mode: 'always'
// =============================================================================

ruleTester.run('prefer-alias-imports (always)', preferAliasImports, {
  valid: [
    // Already using alias
    {
      code: `import { Button } from '@/components/Button';\n`,
      filename: FILE_INDEX,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
    },
    // Third-party import (not first-party)
    {
      code: `import { foo } from 'lodash';\n`,
      filename: FILE_INDEX,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
    },
    // Relative import outside any alias path
    {
      code: `import { standalone } from '../standalone';\n`,
      filename: FILE_INDEX,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@/*': './src/*',
          },
          mode: 'fix',
        },
      },
      options: [{ mode: 'always' }],
    },
    // No aliases configured
    {
      code: `import { Button } from './components/Button';\n`,
      filename: FILE_INDEX,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          mode: 'fix',
        },
      },
      options: [{ mode: 'always' }],
    },
  ],

  invalid: [
    // Relative import replaceable by wildcard alias (from src/index.ts)
    {
      code: `import { Button } from './components/Button';\n`,
      filename: FILE_INDEX,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `import { Button } from '@/components/Button';\n`,
    },
    // Deeper relative import (from src/components/Button.ts)
    {
      code: `import { helper } from '../utils/helper';\n`,
      filename: FILE_BUTTON,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `import { helper } from '@/utils/helper';\n`,
    },
    // Relative import into subdirectory (from src/components/Button.ts)
    {
      code: `import { Label } from './internal/Label';\n`,
      filename: FILE_BUTTON,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `import { Label } from '@/components/internal/Label';\n`,
    },
    // Label importing Button (parent directory) — converted in always mode
    {
      code: `import { Button } from '../Button';\n`,
      filename: FILE_LABEL,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `import { Button } from '@/components/Button';\n`,
    },
    // Preserves file extension
    {
      code: `import { Button } from './components/Button.ts';\n`,
      filename: FILE_INDEX,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `import { Button } from '@/components/Button.ts';\n`,
    },
    // Fixed alias match
    {
      code: `import { standalone } from '../standalone';\n`,
      filename: FILE_INDEX,
      settings: WILDCARD_AND_FIXED_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `import { standalone } from '@standalone';\n`,
    },
    // Reexport
    {
      code: `export { Button } from './components/Button';\n`,
      filename: FILE_INDEX,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `export { Button } from '@/components/Button';\n`,
    },
    // Barrel reexport
    {
      code: `export * from './components/Button';\n`,
      filename: FILE_INDEX,
      settings: WILDCARD_SETTINGS,
      options: [{ mode: 'always' }],
      errors: [{ messageId: 'preferAlias' }],
      output: `export * from '@/components/Button';\n`,
    },
  ],
});

// =============================================================================
// mode: 'relative-if-descendant' (default)
// =============================================================================

ruleTester.run(
  'prefer-alias-imports (relative-if-descendant)',
  preferAliasImports,
  {
    valid: [
      // Relative within same alias — should NOT flag
      {
        code: `import { Button } from './components/Button';\n`,
        filename: FILE_INDEX,
        settings: WILDCARD_SETTINGS,
      },
      // Relative deeper within same alias — should NOT flag
      {
        code: `import { helper } from '../utils/helper';\n`,
        filename: FILE_BUTTON,
        settings: WILDCARD_SETTINGS,
      },
      // Relative into subdirectory within same alias — should NOT flag
      {
        code: `import { Label } from './internal/Label';\n`,
        filename: FILE_BUTTON,
        settings: WILDCARD_SETTINGS,
      },
      // Relative from subdirectory to parent within same alias — should NOT flag
      {
        code: `import { Button } from '../Button';\n`,
        filename: FILE_LABEL,
        settings: WILDCARD_SETTINGS,
      },
      // Alias used for cross-alias import — should NOT flag
      {
        code: `import { Button } from '@/components/Button';\n`,
        filename: FILE_STANDALONE,
        settings: WILDCARD_SETTINGS,
      },
      // Third-party import
      {
        code: `import { foo } from 'lodash';\n`,
        filename: FILE_INDEX,
        settings: WILDCARD_SETTINGS,
      },
    ],

    invalid: [
      // Relative import from outside alias scope should use alias
      {
        code: `import { Button } from './src/components/Button';\n`,
        filename: FILE_STANDALONE,
        settings: WILDCARD_SETTINGS,
        errors: [{ messageId: 'preferAlias' }],
        output: `import { Button } from '@/components/Button';\n`,
      },
      // Alias import should be relative when under same alias
      {
        code: `import { helper } from '@/utils/helper';\n`,
        filename: FILE_BUTTON,
        settings: WILDCARD_SETTINGS,
        errors: [{ messageId: 'preferRelative' }],
        output: `import { helper } from '../utils/helper';\n`,
      },
      // Alias import from index.ts — same alias scope
      {
        code: `import { Button } from '@/components/Button';\n`,
        filename: FILE_INDEX,
        settings: WILDCARD_SETTINGS,
        errors: [{ messageId: 'preferRelative' }],
        output: `import { Button } from './components/Button';\n`,
      },
      // Alias import into subdirectory — same alias scope, should be relative
      {
        code: `import { Label } from '@/components/internal/Label';\n`,
        filename: FILE_BUTTON,
        settings: WILDCARD_SETTINGS,
        errors: [{ messageId: 'preferRelative' }],
        output: `import { Label } from './internal/Label';\n`,
      },
      // Alias import from subdirectory to parent — same alias scope, should be relative
      {
        code: `import { Button } from '@/components/Button';\n`,
        filename: FILE_LABEL,
        settings: WILDCARD_SETTINGS,
        errors: [{ messageId: 'preferRelative' }],
        output: `import { Button } from '../Button';\n`,
      },
      // Relative import from outside alias scope — fixed alias
      {
        code: `import { standalone } from '../standalone';\n`,
        filename: FILE_INDEX,
        settings: WILDCARD_AND_FIXED_SETTINGS,
        errors: [{ messageId: 'preferAlias' }],
        output: `import { standalone } from '@standalone';\n`,
      },
    ],
  }
);
