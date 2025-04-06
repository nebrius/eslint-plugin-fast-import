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

export default {
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
