import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDirname } from 'cross-dirname';
import { noUnusedExports } from './rules/unused/unused.js';
import { noCircularImports } from './rules/circular/circular.js';
import { noEntryPointImports } from './rules/entryPoint/entryPoint.js';
import { noMissingImports } from './rules/missing/missing.js';
import { noExternalBarrelReexports } from './rules/externalBarrelReexports/externalBarrelReexports.js';
import { noTestImportsInProd } from './rules/testInProd/testInProd.js';

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
    'no-circular-imports': noCircularImports,
    'no-entry-point-imports': noEntryPointImports,
    'no-missing-imports': noMissingImports,
    'no-external-barrel-reexports': noExternalBarrelReexports,
    'no-test-imports-in-prod': noTestImportsInProd,
  },
  processors: {},
};

// assign configs here so we can reference `plugin`
Object.assign(plugin.configs, {
  recommended: {
    plugins: {
      'fast-import': plugin,
    },
    rules: {
      'fast-import/no-unused-exports': 'error',
      'fast-import/no-circular-imports': 'error',
      'fast-import/no-entry-point-imports': 'error',
      'fast-import/no-missing-imports': 'error',
      'fast-import/no-external-barrel-reexports': 'error',
      'fast-import/no-test-imports-in-prod': 'error',
    },
  },
  off: {
    plugins: {
      'fast-import': plugin,
    },
    rules: {
      'fast-import/no-unused-exports': 'off',
      'fast-import/no-circular-imports': 'off',
      'fast-import/no-entry-point-imports': 'off',
      'fast-import/no-missing-imports': 'off',
      'fast-import/no-external-barrel-reexports': 'off',
      'fast-import/no-test-imports-in-prod': 'off',
    },
  },
});

export default plugin;
