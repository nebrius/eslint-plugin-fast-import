import { join } from 'node:path';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');
const FILE_INDEX = join(TEST_PACKAGE_DIR, 'src', 'index.ts');

it('Infers entry points by mapping outDir to rootDir, with .ts and .tsx fallbacks', () => {
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_INDEX,
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

  expect(packageSettings.entryPoints).toEqual([
    // .ts substitution from the .js export
    { type: 'static', subPath: '.', filePath: './src/index.ts' },
    // .tsx substitution after .ts substitution misses
    { type: 'static', subPath: './tsx-sub', filePath: './src/comp.tsx' },
    // direct existsSync match without substitution
    { type: 'static', subPath: './direct', filePath: './src/raw.js' },
    // .ts substitution works against non-.js source extensions too
    { type: 'static', subPath: './mjs-sub', filePath: './src/legacy.ts' },
    // .d.ts exports are not used directly (they're compiled artifacts) — they
    // go through the outDir/rootDir mapping like any other compiled path
    { type: 'static', subPath: './decl', filePath: './src/decl.d.ts' },
  ]);
});
