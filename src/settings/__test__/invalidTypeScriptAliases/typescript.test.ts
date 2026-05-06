import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getAllPackageSettings } from '../../settings.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PACKAGE_DIR, 'src', 'a.ts');

it('Throws on invalid tsconfig.compilerOptions.paths', () => {
  expect(() =>
    getAllPackageSettings({
      filename: FILE_A,
      settings: {
        'import-integrity': {
          packageRootDir: TEST_PACKAGE_DIR,
        },
      },
    })
  ).toThrow(
    `tsconfig path "some/fake/path/*", resolved as "${join(TEST_PACKAGE_DIR, 'some', 'fake', 'path')}/*", does not exist`
  );
});
