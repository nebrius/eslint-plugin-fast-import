import { join } from 'node:path';

import { jest } from '@jest/globals';

import { getPackageJsonSettings } from '../../package.js';

const TEST_PACKAGE_DIR = join(import.meta.dirname, 'project');

it('Skips and warns on conditional exports with no recognized condition', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  const result = getPackageJsonSettings(TEST_PACKAGE_DIR);

  expect(result).toEqual({
    packageName: 'package-invalid-condition-test',
    exports: {
      './valid': './valid.js',
    },
  });

  expect(warnSpy).toHaveBeenCalledTimes(1);
  expect(warnSpy.mock.calls[0][0]).toContain('"."');
  expect(warnSpy.mock.calls[0][0]).toContain('worker, browser');

  warnSpy.mockRestore();
});
