import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDirname } from 'cross-dirname';
import { noUnusedExports } from './rules/unused';
import { noCircularImports } from './rules/circular';
import { noEntryPointImportsImports } from './rules/entryPoint';

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
    'no-entry-point-imports': noEntryPointImportsImports,
  },
  processors: {},
};
