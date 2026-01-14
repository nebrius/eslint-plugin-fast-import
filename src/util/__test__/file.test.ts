import { join, resolve } from 'node:path';

import { getDirname } from 'cross-dirname';

import {
  convertToUnixishPath,
  getFiles,
  getRelativePathFromRoot,
  splitPathIntoSegments,
  trimTrailingPathSeparator,
} from '../files.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const ROOT_DIR = resolve(join(getDirname(), '..', '..', '..'));

it('Fetchings files asynchronously', async () => {
  const files = await getFiles(
    join(TEST_PROJECT_DIR, 'src'),
    [{ dir: join(TEST_PROJECT_DIR, 'src'), contents: 'src/c.ts' }],
    []
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expect(files.files.map(({ latestUpdatedAt, ...rest }) => rest)).toEqual([
    {
      filePath: join(TEST_PROJECT_DIR, 'src/a.ts'),
    },
    {
      filePath: join(TEST_PROJECT_DIR, 'src/b.ts'),
    },
  ]);

  expect(files.packageJsons).toEqual([
    join(TEST_PROJECT_DIR, 'package.json'),
    join(ROOT_DIR, 'package.json'),
  ]);
});

it('Can split paths into segments', () => {
  expect(splitPathIntoSegments('a/b/c')).toEqual(['a', 'b', 'c']);
  expect(splitPathIntoSegments('C:\\a\\b\\c')).toEqual(['a', 'b', 'c']);
  expect(() => {
    splitPathIntoSegments('a/b\\c');
  }).toThrow();
});

it('Can convert to unixish path', () => {
  expect(convertToUnixishPath('a/b/c')).toEqual('a/b/c');
  expect(convertToUnixishPath('/a/b/c')).toEqual('/a/b/c');
  expect(convertToUnixishPath('a\\b\\c')).toEqual('a/b/c');
  expect(convertToUnixishPath('C:\\a\\b\\c')).toEqual('/a/b/c');
});

it('Can trim trailing path separators', () => {
  expect(trimTrailingPathSeparator('a/b/c')).toEqual('a/b/c');
  expect(trimTrailingPathSeparator('a/b/c/')).toEqual('a/b/c');
  expect(trimTrailingPathSeparator('C:\\a\\b\\c')).toEqual('C:\\a\\b\\c');
  expect(trimTrailingPathSeparator('C:\\a\\b\\c\\')).toEqual('C:\\a\\b\\c');
});

it('Can get relative path to root', () => {
  expect(getRelativePathFromRoot(`/base`, '/base/src/a.ts')).toEqual(
    'src/a.ts'
  );
  expect(getRelativePathFromRoot(`/base`, '/base')).toEqual('');
  expect(getRelativePathFromRoot(`/base`, '/src/a.ts')).toEqual('src/a.ts');
  expect(getRelativePathFromRoot(`/base`, 'src/a.ts')).toEqual('src/a.ts');
});
