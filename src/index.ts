import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { noUnusedExports } from './rules/unused';
import { getDirname } from 'cross-dirname';
import { setVerbose } from './util/logging';

const { name, version } = JSON.parse(
  readFileSync(join(getDirname(), '..', 'package.json'), 'utf8')
) as { name: string; version: string };

// setVerbose(!!process.env.FAST_ESM_VERBOSE);
setVerbose(true);

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
