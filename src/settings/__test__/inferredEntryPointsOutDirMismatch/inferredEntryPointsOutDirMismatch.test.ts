import { join } from 'node:path';

import { jest } from '@jest/globals';
import { getDirname } from 'cross-dirname';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'src', 'a.ts');

it('Warns and skips inferred entries whose path is outside the TypeScript outDir', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

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

  expect(packageSettings.entryPoints).toEqual([]);
  expect(warnSpy).toHaveBeenCalledTimes(1);
  // Match "Export . in " (trailing space after the dot rules out keys like
  // "./util" that would produce "Export ./util in ...").
  expect(warnSpy.mock.calls[0][0]).toMatch(/Export \. in /);
  expect(warnSpy.mock.calls[0][0]).toContain(
    "doesn't start with TypeScript's outDir ./dist"
  );

  warnSpy.mockRestore();
});
