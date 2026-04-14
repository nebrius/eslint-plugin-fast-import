import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { ParsedPackageSettings } from '../../settings.js';
import { getAllPackageSettings } from '../../settings.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

it('Fetchings settings from typescript', () => {
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: TEST_PROJECT_DIR,
      },
    },
  });

  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }

  // This contains the default entry point setting, which is an internal
  // representation that's difficult to represent here, so we just override it
  packageSettings.entryPoints = [];

  const expected: ParsedPackageSettings = {
    repoRootDir: TEST_PROJECT_DIR,
    packageRootDir: TEST_PROJECT_DIR,
    entryPoints: [],
    ignorePatterns: [],
    ignoreOverridePatterns: [],
    testFilePatterns: [],
    wildcardAliases: {
      '@/': join(TEST_PROJECT_DIR, 'src/'),
    },
    fixedAliases: {
      '@a': FILE_A,
    },
  };
  expect(packageSettings).toEqual(expected);
});
