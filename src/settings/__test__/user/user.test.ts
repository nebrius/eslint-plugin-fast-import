import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { ParsedSettings } from '../../settings.js';
import { getSettings } from '../../settings.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

it('Fetchings user supplied settings', () => {
  const settings = getSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        rootDir: join(TEST_PROJECT_DIR, 'src'),
        alias: {
          '@/*': 'src/*',
          '@a': 'src/a.ts',
        },
        ignorePatterns: ['src/b*'],
        entryPoints: { 'src/a.ts': ['a'] },
      },
    },
  });
  const expected: ParsedSettings = {
    editorUpdateRate: 5_000,
    rootDir: join(TEST_PROJECT_DIR, 'src'),
    mode: 'one-shot',
    parallelizationMode: 'auto',
    ignorePatterns: [
      { dir: TEST_PROJECT_DIR, contents: join(TEST_PROJECT_DIR, 'src/b*') },
    ],
    wildcardAliases: {
      '@/': join(TEST_PROJECT_DIR, 'src/'),
    },
    fixedAliases: {
      '@a': FILE_A,
    },
    entryPoints: [
      {
        file: 'src/a.ts',
        symbols: ['a'],
      },
    ],
  };
  expect(settings).toEqual(expected);
});

it('Throws on invalid user supplied mode', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          mode: 'fake',
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
