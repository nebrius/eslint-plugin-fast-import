import { join, resolve } from 'node:path';

import { getDirname } from 'cross-dirname';

import {
  _reset,
  convertToUnixishPath,
  getFiles,
  getRelativePathFromRoot,
  splitPathIntoSegments,
  trimTrailingPathSeparator,
} from '../files.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const ROOT_DIR = resolve(join(getDirname(), '..', '..', '..'));

beforeEach(() => {
  _reset();
});

it('Fetches files asynchronously, respecting ignorePatterns', async () => {
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

it('ignoreOverridePatterns overrides .gitignore patterns', async () => {
  // The test project's .gitignore contains 'src/c.ts', so c.ts is ignored by default.
  // First verify that without override, src/c.ts is ignored
  const filesWithoutOverride = await getFiles(
    join(TEST_PROJECT_DIR, 'src'),
    [{ dir: join(TEST_PROJECT_DIR, 'src'), contents: 'src/c.ts' }],
    []
  );
  expect(
    filesWithoutOverride.files.map(({ filePath }) => filePath)
  ).not.toContain(join(TEST_PROJECT_DIR, 'src/c.ts'));

  // Reset to clear the cached ignore data
  _reset();

  // Now verify that ignoreOverridePatterns brings back the ignored file.
  // The override pattern 'src/c.ts' is relative to TEST_PROJECT_DIR (the project root)
  // to match the .gitignore pattern structure
  const filesWithOverride = await getFiles(
    join(TEST_PROJECT_DIR, 'src'),
    [{ dir: join(TEST_PROJECT_DIR, 'src'), contents: 'src/c.ts' }],
    [{ dir: TEST_PROJECT_DIR, contents: 'src/c.ts' }]
  );
  expect(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filesWithOverride.files.map(({ latestUpdatedAt, ...rest }) => rest)
  ).toEqual([
    {
      filePath: join(TEST_PROJECT_DIR, 'src/a.ts'),
    },
    {
      filePath: join(TEST_PROJECT_DIR, 'src/b.ts'),
    },
    {
      filePath: join(TEST_PROJECT_DIR, 'src/c.ts'),
    },
  ]);
});

it('ignoreOverridePatterns works with glob patterns', async () => {
  // Verify that a glob pattern in ignoreOverridePatterns works.
  // The .gitignore pattern 'src/c.ts' is overridden by 'src/*.ts' glob
  const files = await getFiles(
    join(TEST_PROJECT_DIR, 'src'),
    [{ dir: join(TEST_PROJECT_DIR, 'src'), contents: 'src/c.ts' }],
    [{ dir: TEST_PROJECT_DIR, contents: 'src/*.ts' }]
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expect(files.files.map(({ latestUpdatedAt, ...rest }) => rest)).toEqual([
    {
      filePath: join(TEST_PROJECT_DIR, 'src/a.ts'),
    },
    {
      filePath: join(TEST_PROJECT_DIR, 'src/b.ts'),
    },
    {
      filePath: join(TEST_PROJECT_DIR, 'src/c.ts'),
    },
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
