import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getSettings } from '../../settings.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

it('Throws on invalid tsconfig.compilerOptions.paths', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
        },
      },
    })
  ).toThrow(
    `tsconfig path "some/fake/path/*", resolved as "${join(TEST_PROJECT_DIR, 'some', 'fake', 'path')}/*", does not exist`
  );
});
