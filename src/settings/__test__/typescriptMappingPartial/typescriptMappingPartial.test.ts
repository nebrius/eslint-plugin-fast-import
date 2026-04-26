import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getTypeScriptSettings } from '../../typescript.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');

it('Returns undefined mapping when only one of rootDir/outDir is set', () => {
  const result = getTypeScriptSettings(TEST_PACKAGE_DIR);

  expect(result.mapping).toBeUndefined();
});
