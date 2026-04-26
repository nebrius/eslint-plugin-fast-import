import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getPackageJsonSettings } from '../../package.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');

it('Falls back to main when no exports field is present', () => {
  const result = getPackageJsonSettings(TEST_PACKAGE_DIR);

  expect(result).toEqual({
    packageName: 'package-main-only-test',
    exports: {
      '.': './index.js',
    },
  });
});
