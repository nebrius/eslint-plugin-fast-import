import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { ParsedPackageSettings } from '../../settings.js';
import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'src', 'a.ts');

it('Fetchings settings from package.json', () => {
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_A,
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

  // This contains the default entry point setting, which is an internal
  // representation that's difficult to represent here, so we just override it
  packageSettings.entryPoints = [];
  packageSettings.externallyImported = [];

  const expected: ParsedPackageSettings = {
    repoRootDir: TEST_PACKAGE_DIR,
    packageRootDir: TEST_PACKAGE_DIR,
    packageName: 'settings-test-package',
    entryPoints: [],
    externallyImported: [],
    ignorePatterns: [],
    ignoreOverridePatterns: [],
    testFilePatterns: [],
    wildcardAliases: {},
    fixedAliases: {},
  };
  expect(packageSettings).toEqual(expected);
});
