import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDirname } from 'cross-dirname';
import { noUnusedExports } from './rules/unused';
import { noCircularImports } from './rules/circular';
import { noEntryPointImports } from './rules/entryPoint';
import { noMissingImports } from './rules/missing';
import { noExternalBarrelReexports } from './rules/externalBarrelReexports';
import { noTestImportsInProd } from './rules/testInProd';

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
      'fast-esm': plugin,
    },
    rules: {
      'fast-esm/no-unused-exports': 'error',
      'fast-esm/no-circular-imports': 'error',
      'fast-esm/no-entry-point-imports': 'error',
      'fast-esm/no-missing-imports': 'error',
      'fast-esm/no-external-barrel-reexports': 'error',
      'fast-esm/no-test-imports-in-prod': 'error',
    },
  },
  off: {
    plugins: {
      'fast-esm': plugin,
    },
    rules: {
      'fast-esm/no-unused-exports': 'off',
      'fast-esm/no-circular-imports': 'off',
      'fast-esm/no-entry-point-imports': 'off',
      'fast-esm/no-missing-imports': 'off',
      'fast-esm/no-external-barrel-reexports': 'off',
      'fast-esm/no-test-imports-in-prod': 'off',
    },
  },
});

export default plugin;
