import { join } from 'node:path';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');
const FILE_INDEX = join(TEST_PACKAGE_DIR, 'src', 'index.ts');

it('Does not treat .d.ts/.d.mts/.d.cts exports as direct TypeScript entries', () => {
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

  // Only the genuine TypeScript source export survives. The `.d.ts`,
  // `.d.mts`, and `.d.cts` exports are compiled artifacts, so they're not
  // used as direct entries. With no tsconfig outDir/rootDir mapping, there's
  // no fallback path either, so they're silently skipped.
  expect(packageSettings.entryPoints).toEqual([
    { type: 'static', subPath: '.', filePath: './src/index.ts' },
  ]);
});
