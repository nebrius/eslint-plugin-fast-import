import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { noUnusedExports } from './rules/unused';

const { name, version } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
) as { name: string; version: string };

const plugin = {
  meta: {
    name,
    version,
  },
  configs: {},
  rules: {
    'no-unused-exports': noUnusedExports,
  },
  processors: {},
};

export default plugin;

export { computeBaseInfo } from './module/computeBaseInfo';
export { computeResolvedInfo } from './module/computeResolvedInfo';
export { computeAnalyzedInfo } from './module/computeAnalyzedInfo';
