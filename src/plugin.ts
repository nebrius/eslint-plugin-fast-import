import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { TSESLint } from '@typescript-eslint/utils';
import { getDirname } from 'cross-dirname';

import { noCycle } from './rules/cycle/cycle.js';
import { noEntryPointImports } from './rules/entryPoint/entryPoint.js';
import { noExternalBarrelReexports } from './rules/externalBarrelReexports/externalBarrelReexports.js';
import { noMissingImports } from './rules/missing/missing.js';
import { nodePrefix } from './rules/nodePrefix/nodePrefix.js';
import { noTestImportsInProd } from './rules/testInProd/testInProd.js';
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
    'no-unused-exports': noUnusedExports,
    'no-cycle': noCycle,
    'no-entry-point-imports': noEntryPointImports,
    'no-missing-imports': noMissingImports,
    'no-external-barrel-reexports': noExternalBarrelReexports,
    'no-test-imports-in-prod': noTestImportsInProd,
    'require-node-prefix': nodePrefix,
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
    'fast-import/no-missing-imports': 'error',
    'fast-import/no-external-barrel-reexports': 'error',
    'fast-import/no-test-imports-in-prod': 'error',
    'fast-import/require-node-prefix': 'off',
  },
} as const;

const allConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/no-unused-exports': 'error',
    'fast-import/no-cycle': 'error',
    'fast-import/no-entry-point-imports': 'error',
    'fast-import/no-missing-imports': 'error',
    'fast-import/no-external-barrel-reexports': 'error',
    'fast-import/no-test-imports-in-prod': 'error',
    'fast-import/require-node-prefix': 'error',
  },
} as const;

const offConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/no-unused-exports': 'off',
    'fast-import/no-cycle-imports': 'off',
    'fast-import/no-entry-point-imports': 'off',
    'fast-import/no-missing-imports': 'off',
    'fast-import/no-external-barrel-reexports': 'off',
    'fast-import/no-test-imports-in-prod': 'off',
    'fast-import/require-node-prefix': 'off',
  },
} as const;

Object.assign(plugin.configs, {
  recommended: recommendedConfig,
  all: allConfig,
  off: offConfig,
});

export default plugin;

export function recommended(
  settings: UserSettings = {}
): TSESLint.FlatConfig.Config {
  return {
    ...recommendedConfig,
    settings: {
      'fast-import': settings,
    },
  };
}

export function all(settings: UserSettings = {}): TSESLint.FlatConfig.Config {
  return {
    ...allConfig,
    settings: {
      'fast-import': settings,
    },
  };
}
