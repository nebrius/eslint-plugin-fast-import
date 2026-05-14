import { join } from 'node:path';

import { jest } from '@jest/globals';
import { getDirname } from 'cross-dirname';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'src', 'a.ts');

// A tsconfig `paths` entry pointing to a non-existent location used to throw,
// crashing the rule outright. The plugin now warns and skips the alias instead,
// matching how every other tsconfig issue in the same parser is handled.
it('Warns and skips invalid tsconfig.compilerOptions.paths instead of throwing', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  expect(() =>
    getAllPackageSettings({
      filename: FILE_A,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
        },
      },
    })
  ).not.toThrow();

  const expectedMessage = `tsconfig path "some/fake/path/*", resolved as "${join(TEST_PACKAGE_DIR, 'some', 'fake', 'path')}/*", does not exist`;
  const matched = warnSpy.mock.calls.some(([msg]) =>
    typeof msg === 'string' ? msg.includes(expectedMessage) : false
  );
  expect(matched).toBe(true);

  warnSpy.mockRestore();
});
