import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { TSESLint } from '@typescript-eslint/utils';
import { getDirname } from 'cross-dirname';

import { noCycle } from './rules/cycle/cycle.js';
import { noEntryPointImports } from './rules/entryPoint/entryPoint.js';
import { consistentFileExtensions } from './rules/extension/extension.js';
import { noExternalBarrelReexports } from './rules/externalBarrelReexports/externalBarrelReexports.js';
import { namedAsDefault } from './rules/namedAsDefault/namedAsDefault.js';
import { nodePrefix } from './rules/nodePrefix/nodePrefix.js';
import { noRestrictedImports } from './rules/restricted/restricted.js';
import { noTestImportsInProd } from './rules/testInProd/testInProd.js';
import { noUnresolvedImports } from './rules/unresolved/unresolved.js';
import { noUnusedExports } from './rules/unused/unused.js';
import type { UserSettings } from './settings/user.js';

// Helper exports
export {
  getESMInfo,
  registerUpdateListener,
  isNonTestFile,
} from './rules/util.js';

// Plugin export
const { name, version } = JSON.parse(
  readFileSync(join(getDirname(), '..', 'package.json'), 'utf8')
) as { name: string; version: string };

const plugin = {
  meta: {
    name,
    version,
  },
  configs: {},
  rules: {
    'consistent-file-extensions': consistentFileExtensions,
    'no-unused-exports': noUnusedExports,
    'no-cycle': noCycle,
    'no-entry-point-imports': noEntryPointImports,
    'no-unresolved-imports': noUnresolvedImports,
    'no-external-barrel-reexports': noExternalBarrelReexports,
    'no-test-imports-in-prod': noTestImportsInProd,
    'no-named-as-default': namedAsDefault,
    'require-node-prefix': nodePrefix,
    'no-restricted-imports': noRestrictedImports,
  },
  processors: {},
};

const recommendedConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/no-unused-exports': 'error',
    'fast-import/no-cycle': 'error',
    'fast-import/no-entry-point-imports': 'error',
    'fast-import/no-unresolved-imports': 'error',
    'fast-import/no-external-barrel-reexports': 'error',
    'fast-import/no-test-imports-in-prod': 'error',
    'fast-import/no-named-as-default': 'error',
    'fast-import/require-node-prefix': 'off',
  },
} as const;

const allConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/consistent-file-extensions': 'error',
    'fast-import/no-unused-exports': 'error',
    'fast-import/no-cycle': 'error',
    'fast-import/no-entry-point-imports': 'error',
    'fast-import/no-unresolved-imports': 'error',
    'fast-import/no-external-barrel-reexports': 'error',
    'fast-import/no-test-imports-in-prod': 'error',
    'fast-import/no-named-as-default': 'error',
    'fast-import/require-node-prefix': 'error',
  },
} as const;

const offConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/consistent-file-extensions': 'off',
    'fast-import/no-unused-exports': 'off',
    'fast-import/no-cycle': 'off',
    'fast-import/no-entry-point-imports': 'off',
    'fast-import/no-unresolved-imports': 'off',
    'fast-import/no-external-barrel-reexports': 'off',
    'fast-import/no-test-imports-in-prod': 'off',
    'fast-import/no-named-as-default': 'off',
    'fast-import/require-node-prefix': 'off',
    'fast-import/no-restricted-imports': 'off',
  },
} as const;

Object.assign(plugin.configs, {
  recommended: recommendedConfig,
  all: allConfig,
  off: offConfig,
});

export default plugin;

export function recommended({
  requireFileExtensions,
  ...settings
}: UserSettings & {
  requireFileExtensions?: boolean;
}): TSESLint.FlatConfig.Config {
  return {
    ...{
      ...recommendedConfig,
      rules: {
        ...recommendedConfig.rules,
        'fast-import/consistent-file-extensions': [
          'error',
          {
            mode: requireFileExtensions !== false ? 'always' : 'never',
          },
        ],
      },
    },
    settings: {
      'fast-import': settings,
    },
  };
}

export function all({
  requireFileExtensions,
  ...settings
}: UserSettings & {
  requireFileExtensions?: boolean;
}): TSESLint.FlatConfig.Config {
  return {
    ...{
      ...allConfig,
      rules: {
        ...allConfig.rules,
        'fast-import/consistent-file-extensions': [
          'error',
          {
            mode: requireFileExtensions !== false ? 'always' : 'never',
          },
        ],
      },
    },
    settings: {
      'fast-import': settings,
    },
  };
}
