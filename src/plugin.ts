import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { noCycle } from './rules/no-cycle/rule.js';
import { noEntryPointImports } from './rules/no-entry-point-imports/rule.js';
import { noExternalBarrelReexports } from './rules/no-external-barrel-reexports/rule.js';
import { noNamedAsDefault } from './rules/no-named-as-default/rule.js';
import { noNodeBuiltins } from './rules/no-node-builtins/rule.js';
import { noRestrictedImports } from './rules/no-restricted-imports/rule.js';
import { noTestImportsInProd } from './rules/no-test-imports-in-prod/rule.js';
import { noTestOnlyImports } from './rules/no-test-only-imports/rule.js';
import { noUnresolvedImports } from './rules/no-unresolved-imports/rule.js';
import { noUnusedExports } from './rules/no-unused-exports/rule.js';
import { noUnusedPackageExports } from './rules/no-unused-package-exports/rule.js';
import { preferAliasImports } from './rules/prefer-alias-imports/rule.js';
import { requireNodePrefix } from './rules/require-node-prefix/rule.js';

// Helper exports
export {
  getESMInfo,
  registerUpdateListener,
  isNonTestFile,
  getLocFromRange,
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
    'no-cycle': noCycle,
    'no-entry-point-imports': noEntryPointImports,
    'no-external-barrel-reexports': noExternalBarrelReexports,
    'no-named-as-default': noNamedAsDefault,
    'no-node-builtins': noNodeBuiltins,
    'no-restricted-imports': noRestrictedImports,
    'no-test-imports-in-prod': noTestImportsInProd,
    'no-test-only-imports': noTestOnlyImports,
    'no-unresolved-imports': noUnresolvedImports,
    'no-unused-exports': noUnusedExports,
    'no-unused-package-exports': noUnusedPackageExports,
    'prefer-alias-imports': preferAliasImports,
    'require-node-prefix': requireNodePrefix,
  },
  processors: {},
};

const recommendedConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/no-cycle': 'error',
    'fast-import/no-entry-point-imports': 'error',
    'fast-import/no-external-barrel-reexports': 'error',
    'fast-import/no-named-as-default': 'error',
    'fast-import/no-test-imports-in-prod': 'error',
    'fast-import/no-test-only-imports': 'error',
    'fast-import/no-unresolved-imports': 'error',
    'fast-import/no-unused-exports': 'error',
    'fast-import/prefer-alias-imports': 'error',
    'fast-import/require-node-prefix': 'off',
  },
} as const;

const monorepoRecommendedConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'no-unused-package-exports': noUnusedPackageExports,
  },
} as const;

const offConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/no-unused-exports': 'off',
    'fast-import/no-test-only-imports': 'off',
    'fast-import/no-cycle': 'off',
    'fast-import/no-entry-point-imports': 'off',
    'fast-import/no-unresolved-imports': 'off',
    'fast-import/no-external-barrel-reexports': 'off',
    'fast-import/no-test-imports-in-prod': 'off',
    'fast-import/no-named-as-default': 'off',
    'fast-import/no-node-builtins': 'off',
    'fast-import/require-node-prefix': 'off',
    'fast-import/no-restricted-imports': 'off',
    'fast-import/prefer-alias-imports': 'off',
  },
} as const;

Object.assign(plugin.configs, {
  recommended: recommendedConfig,
  monorepoRecommended: monorepoRecommendedConfig,
  off: offConfig,
});

export default plugin as typeof plugin & {
  configs: {
    recommended: typeof recommendedConfig;
    monorepoRecommended: typeof monorepoRecommendedConfig;
    off: typeof offConfig;
  };
};
