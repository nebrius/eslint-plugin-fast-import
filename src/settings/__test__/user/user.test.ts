import { join, sep } from 'node:path';

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
    ignorePatterns: [{ dir: TEST_PROJECT_DIR, contents: 'src/b*' }],
    ignoreOverridePatterns: [],
    wildcardAliases: {
      '@/': join(TEST_PROJECT_DIR, 'src' + sep),
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
    message: Invalid input: expected string, received undefined
`);
});

it('Throws on relative rootDir in settings', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: './foo',
        },
      },
    })
  ).toThrow(`rootDir "./foo" must be absolute`);
});

it("Throws on rootDir that doesn't exist in settings", () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: join(TEST_PROJECT_DIR, 'fake'),
        },
      },
    })
  ).toThrow(`rootDir "${join(TEST_PROJECT_DIR, 'fake')}" does not exist`);
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
  Invalid value for property "mode"
    values: auto,one-shot,fix,editor
    message: Invalid option: expected one of "auto"|"one-shot"|"fix"|"editor"
`);
});

it('Throws on mismatched wildcard aliases', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@/*': 'src/a.ts',
          },
        },
      },
    })
  ).toThrow(
    `Alias path ${join(TEST_PROJECT_DIR, 'src', 'a.ts')} must end with "*" when @/* ends with "*"`
  );
});

it('Throws on mismatched fixed aliases', () => {
  expect(() =>
    getSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          rootDir: TEST_PROJECT_DIR,
          alias: {
            '@a': 'src/a.ts*',
          },
        },
      },
    })
  ).toThrow(
    `Alias path ${join(TEST_PROJECT_DIR, 'src', 'a.ts*')} must not end with "*" when @a does not end with "*"`
  );
});

it('Can set mode to editor', () => {
  const editorSettings = getSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'editor',
        rootDir: TEST_PROJECT_DIR,
      },
    },
  });
  expect(editorSettings.mode).toBe('editor');
});

it('Can set mode to fix', () => {
  const fixSettings = getSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'fix',
        rootDir: TEST_PROJECT_DIR,
      },
    },
  });
  expect(fixSettings.mode).toBe('fix');
});

it('Ignores aliases that point outside of rootDir', () => {
  const settings = getSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        rootDir: TEST_PROJECT_DIR,
        alias: {
          '@foo': '../foo',
          '@bar/*': '../bar/*',
        },
      },
    },
  });
  expect(settings.fixedAliases).toEqual({});
  expect(settings.wildcardAliases).toEqual({});
});

it('Ignores when an entry point is absolute', () => {
  const settings = getSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        rootDir: TEST_PROJECT_DIR,
        entryPoints: { '/foo/a.ts': ['a'] },
      },
    },
  });
  expect(settings.entryPoints.length).toEqual(0);
});
