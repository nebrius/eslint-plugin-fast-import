import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_INDEX = join(TEST_PACKAGE_DIR, 'src', 'index.ts');

it('Merges user-supplied entryPointFiles with inferred entries (override on collision, additive otherwise)', () => {
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_INDEX,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: TEST_PACKAGE_DIR,
        entryPointFiles: {
          // collides with inferred '.' → user wins
          '.': './src/override.ts',
          // user-only key → coexists with inferred entries
          './user-only': './src/user.ts',
        },
      },
    },
  });

  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }

  expect(packageSettings.entryPoints).toEqual([
    // '.' was inferred to './src/index.ts', overridden by user
    { type: 'static', subPath: '.', filePath: './src/override.ts' },
    // './extra' was inferred and not overridden → preserved
    { type: 'static', subPath: './extra', filePath: './src/extra.ts' },
    // user-only key → appended
    { type: 'static', subPath: './user-only', filePath: './src/user.ts' },
  ]);
});
