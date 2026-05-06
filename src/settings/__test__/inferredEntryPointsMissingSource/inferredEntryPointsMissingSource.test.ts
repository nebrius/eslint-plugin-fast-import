import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'src', 'a.ts');

it('Silently skips inferred entries when none of the substituted source files exist', () => {
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_A,
    settings: {
      'import-integrity': {
        mode: 'one-shot',
        packageRootDir: TEST_PACKAGE_DIR,
      },
    },
  });

  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }

  // None of ./src/missing.{js,ts,tsx} exist, so the entry is silently skipped
  expect(packageSettings.entryPoints).toEqual([]);
});
