import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { noCycle } from './rules/no-cycle/rule.js';
import { noEmptyEntryPoints } from './rules/no-empty-entry-points/rule.js';
import { noEntryPointImports } from './rules/no-entry-point-imports/rule.js';
import { noExternalBarrelReexports } from './rules/no-external-barrel-reexports/rule.js';
import { noNamedAsDefault } from './rules/no-named-as-default/rule.js';
import { noNodeBuiltins } from './rules/no-node-builtins/rule.js';
import { noRestrictedImports } from './rules/no-restricted-imports/rule.js';
import { noTestImportsInProd } from './rules/no-test-imports-in-prod/rule.js';
import { noTestOnlyImports } from './rules/no-test-only-imports/rule.js';
import { noUnnamedEntryPointExports } from './rules/no-unnamed-entry-point-exports/rule.js';
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
  readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')
) as { name: string; version: string };

const plugin = {
  meta: {
    name,
    version,
  },
  configs: {},
  rules: {
    'no-cycle': noCycle,
    'no-empty-entry-points': noEmptyEntryPoints,
    'no-entry-point-imports': noEntryPointImports,
    'no-external-barrel-reexports': noExternalBarrelReexports,
    'no-named-as-default': noNamedAsDefault,
    'no-node-builtins': noNodeBuiltins,
    'no-restricted-imports': noRestrictedImports,
    'no-test-imports-in-prod': noTestImportsInProd,
    'no-test-only-imports': noTestOnlyImports,
    'no-unnamed-entry-point-exports': noUnnamedEntryPointExports,
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
    'import-integrity': plugin,
  },
  rules: {
    'import-integrity/no-cycle': 'error',
    'import-integrity/no-empty-entry-points': 'error',
    'import-integrity/no-entry-point-imports': 'error',
    'import-integrity/no-external-barrel-reexports': 'error',
    'import-integrity/no-named-as-default': 'error',
    'import-integrity/no-test-imports-in-prod': 'error',
    'import-integrity/no-test-only-imports': 'error',
    'import-integrity/no-unnamed-entry-point-exports': 'error',
    'import-integrity/no-unresolved-imports': 'error',
    'import-integrity/no-unused-exports': 'error',
    'import-integrity/prefer-alias-imports': 'error',
    'import-integrity/require-node-prefix': 'error',
  },
} as const;

const monorepoRecommendedConfig = {
  plugins: {
    'import-integrity': plugin,
  },
  rules: {
    'import-integrity/no-unused-package-exports': 'error',
  },
} as const;

const offConfig = {
  plugins: {
    'import-integrity': plugin,
  },
  rules: {
    'import-integrity/no-cycle': 'off',
    'import-integrity/no-empty-entry-points': 'off',
    'import-integrity/no-entry-point-imports': 'off',
    'import-integrity/no-external-barrel-reexports': 'off',
    'import-integrity/no-named-as-default': 'off',
    'import-integrity/no-node-builtins': 'off',
    'import-integrity/no-restricted-imports': 'off',
    'import-integrity/no-test-imports-in-prod': 'off',
    'import-integrity/no-test-only-imports': 'off',
    'import-integrity/no-unnamed-entry-point-exports': 'off',
    'import-integrity/no-unresolved-imports': 'off',
    'import-integrity/no-unused-exports': 'off',
    'import-integrity/no-unused-package-exports': 'off',
    'import-integrity/prefer-alias-imports': 'off',
    'import-integrity/require-node-prefix': 'off',
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
