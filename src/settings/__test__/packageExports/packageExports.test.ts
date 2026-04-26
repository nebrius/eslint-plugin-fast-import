import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getPackageJsonSettings } from '../../package.js';

const TEST_PACKAGE_DIR = join(getDirname(), 'project');

it('Parses package.json exports with conditional resolution and main fallback', () => {
  const result = getPackageJsonSettings(TEST_PACKAGE_DIR);

  expect(result).toEqual({
    packageName: 'package-exports-test',
    exports: {
      // exports['.'] takes precedence over main
      '.': './root.js',
      // string export passes through unchanged
      './string': './string.js',
      // each conditional precedence level resolves to the highest-priority condition present
      './node-addons': './na.js',
      './node': './n.js',
      './import': './i.js',
      './require': './r.js',
      './module-sync': './ms.js',
      './default': './d.js',
      // "types" is intentionally ignored; falls through to "import"
      './types-ignored': './i.js',
    },
  });
});
