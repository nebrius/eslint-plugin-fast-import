import { join, sep } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { ParsedPackageSettings } from '../../settings.js';
import { getPackageSettings, getRepoSettings } from '../../settings.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

it('Fetchings user supplied settings', () => {
  const { entryPoints, ...settings } = getPackageSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: TEST_PROJECT_DIR,
        alias: {
          '@/*': 'src/*',
          '@a': 'src/a.ts',
        },
        ignorePatterns: ['src/b*'],
        ignoreOverridePatterns: ['src/c*'],
        entryPointFiles: ['src/a.ts'],
        externallyImportedFiles: ['src/b.ts'],
      },
    },
  });
  const expected: Omit<ParsedPackageSettings, 'entryPoints'> = {
    repoRootDir: TEST_PROJECT_DIR,
    packageRootDir: TEST_PROJECT_DIR,
    ignorePatterns: [{ dir: TEST_PROJECT_DIR, contents: 'src/b*' }],
    ignoreOverridePatterns: [{ dir: TEST_PROJECT_DIR, contents: 'src/c*' }],
    testFilePatterns: [],
    wildcardAliases: {
      '@/': join(TEST_PROJECT_DIR, 'src' + sep),
    },
    fixedAliases: {
      '@a': FILE_A,
    },
  };
  expect(settings).toEqual(expected);
  expect(entryPoints).toHaveLength(3);
  expect(entryPoints[0].file.ignores('src/a.ts')).toBeTruthy();
  expect(entryPoints[0].file.ignores('src/b.ts')).toBeFalsy();
  expect(entryPoints[1].file.ignores('src/b.ts')).toBeTruthy();
  expect(entryPoints[1].file.ignores('src/a.ts')).toBeFalsy();
});

it('Throws on missing settings', () => {
  expect(() =>
    getPackageSettings({
      filename: FILE_A,
      settings: {},
    })
  ).toThrow(
    `eslint-plugin-fast-import settings are required in your ESLint/Oxlint config file`
  );
});

it('Throws on missing packageRootDir in settings', () => {
  expect(() =>
    getPackageSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {},
      },
    })
  ).toThrow(`Invalid settings:
  Invalid type for property "packageRootDir"
    expected: string
    message: Invalid input: expected string, received undefined
`);
});

it('Throws on relative packageRootDir in settings', () => {
  expect(() =>
    getPackageSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          packageRootDir: './foo',
        },
      },
    })
  ).toThrow(`packageRootDir "./foo" must be absolute`);
});

it("Throws on packageRootDir that doesn't exist in settings", () => {
  expect(() =>
    getPackageSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          packageRootDir: join(TEST_PROJECT_DIR, 'fake'),
        },
      },
    })
  ).toThrow(
    `packageRootDir "${join(TEST_PROJECT_DIR, 'fake')}" does not exist`
  );
});

it('Throws on invalid user supplied mode', () => {
  expect(() =>
    getPackageSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          mode: 'fake',
          packageRootDir: TEST_PROJECT_DIR,
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
    getPackageSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PROJECT_DIR,
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
    getPackageSettings({
      filename: FILE_A,
      settings: {
        'fast-import': {
          packageRootDir: TEST_PROJECT_DIR,
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
  const editorSettings = getRepoSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'editor',
        packageRootDir: TEST_PROJECT_DIR,
      },
    },
  });
  expect(editorSettings.mode).toBe('editor');
});

it('Can set mode to fix', () => {
  const fixSettings = getRepoSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'fix',
        packageRootDir: TEST_PROJECT_DIR,
      },
    },
  });
  expect(fixSettings.mode).toBe('fix');
});

it('Ignores aliases that point outside of packageRootDir', () => {
  const settings = getPackageSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        packageRootDir: TEST_PROJECT_DIR,
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

it('Supports { regexp: string } for entry point symbols', () => {
  const { entryPoints } = getPackageSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: TEST_PROJECT_DIR,
        entryPointFiles: ['src/a.ts'],
      },
    },
  });
  expect(entryPoints).toHaveLength(2);
  expect(entryPoints[0].file.ignores('src/a.ts')).toBeTruthy();
});
