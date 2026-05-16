import { join } from 'node:path';

import { getPackageJsonSettings } from '../../package.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');

it('Fills in the "." subpath from main when exports lacks it', () => {
  const result = getPackageJsonSettings(TEST_PACKAGE_DIR);

  expect(result).toEqual({
    packageName: 'package-main-and-exports-test',
    exports: {
      // main fills in '.' since exports has no '.' entry of its own
      '.': './main.js',
      // exports entries with non-'.' keys are preserved
      './util': './util.js',
    },
  });
});
