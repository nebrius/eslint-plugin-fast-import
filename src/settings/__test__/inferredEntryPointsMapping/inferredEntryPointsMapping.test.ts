import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_INDEX = join(TEST_PACKAGE_DIR, 'src', 'index.ts');

it('Infers entry points by mapping outDir to rootDir, with .ts and .tsx fallbacks', () => {
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

  expect(packageSettings.entryPoints).toEqual([
    // .ts substitution from the .js export
    { type: 'static', subPath: '.', filePath: './src/index.ts' },
    // .tsx substitution after .ts substitution misses
    { type: 'static', subPath: './tsx-sub', filePath: './src/comp.tsx' },
    // direct existsSync match without substitution
    { type: 'static', subPath: './direct', filePath: './src/raw.js' },
    // .ts substitution works against non-.js source extensions too
    { type: 'static', subPath: './mjs-sub', filePath: './src/legacy.ts' },
  ]);
});
