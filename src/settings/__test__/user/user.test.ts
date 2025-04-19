import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { ParsedSettings } from '../../settings.js';
import { getSettings } from '../../settings.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

it('Fetchings user supplied settings', () => {
  const { entryPoints, ...settings } = getSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        rootDir: TEST_PROJECT_DIR,
        alias: {
          '@/*': 'src/*',
          '@a': 'src/a.ts',
        },
        ignorePatterns: ['src/b*'],
        entryPoints: { 'src/a.ts': ['a'] },
      },
    },
  });
  const expected: Omit<ParsedSettings, 'entryPoints'> = {
    editorUpdateRate: 5_000,
    rootDir: TEST_PROJECT_DIR,
    mode: 'one-shot',
    ignorePatterns: [
      { dir: TEST_PROJECT_DIR, contents: join(TEST_PROJECT_DIR, 'src/b*') },
    ],
    wildcardAliases: {
      '@/': join(TEST_PROJECT_DIR, 'src/'),
    },
    fixedAliases: {
      '@a': FILE_A,
    },
  };
  expect(settings).toEqual(expected);
  expect(entryPoints).toHaveLength(1);
  expect(entryPoints[0].file.ignores('src/a.ts')).toBeTruthy();
  expect(entryPoints[0].file.ignores('src/b.ts')).toBeFalsy();
  expect(entryPoints[0].symbols).toEqual(['a']);
});

it('Throws on missing settings', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {},
    })
  ).toThrow(
    `eslint-plugin-fast-import settings are required in your ESLint config file`
  );
});

it('Throws on missing rootDir in settings', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {},
      },
    })
  ).toThrow(`Invalid settings:
  Invalid type for property "rootDir"
    expected: string
    received: undefined
    message: Required
`);
});

it('Throws on invalid user supplied mode', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          mode: 'fake',
          rootDir: TEST_PROJECT_DIR,
        },
      },
    })
  ).toThrow(`Invalid settings:
  Invalid enum_value for property "mode"
    received: fake
    options: auto,one-shot,fix,editor
    message: Invalid enum value. Expected 'auto' | 'one-shot' | 'fix' | 'editor', received 'fake'
`);
});
