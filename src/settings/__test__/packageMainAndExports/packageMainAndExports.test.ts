import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getPackageJsonSettings } from '../../package.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');

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
