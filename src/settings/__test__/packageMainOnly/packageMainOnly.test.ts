import { join } from 'node:path';

import { getPackageJsonSettings } from '../../package.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');

it('Falls back to main and normalizes bare main paths when no exports field is present', () => {
  const result = getPackageJsonSettings(TEST_PACKAGE_DIR);

  expect(result).toEqual({
    packageName: 'package-main-only-test',
    exports: {
      '.': './index.js',
    },
  });
});
