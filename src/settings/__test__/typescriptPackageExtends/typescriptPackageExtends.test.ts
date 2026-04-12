import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { ParsedPackageSettings } from '../../settings.js';
import { getPackageSettings } from '../../settings.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

it('Fetches settings from tsconfig with package path extends', () => {
  const settings = getPackageSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: TEST_PROJECT_DIR,
      },
    },
  });

  // This contains the default entry point setting, which is an internal
  // representation that's difficult to represent here, so we just override it
  settings.entryPoints = [];

  const expected: ParsedPackageSettings = {
    repoRootDir: TEST_PROJECT_DIR,
    packageRootDir: TEST_PROJECT_DIR,
    entryPoints: [],
    ignorePatterns: [],
    ignoreOverridePatterns: [],
    testFilePatterns: [],
    wildcardAliases: {
      '@pkg/': join(TEST_PROJECT_DIR, 'src/'),
    },
    fixedAliases: {},
  };
  expect(settings).toEqual(expected);
});
