import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_INDEX = join(TEST_PACKAGE_DIR, 'src', 'index.ts');

it('Skips inference entirely when there is no tsconfig mapping', () => {
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_INDEX,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: TEST_PACKAGE_DIR,
      },
    },
  });

  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }

  // No mapping means no inference — even though exports are present
  expect(packageSettings.entryPoints).toEqual([]);
});
