import { join, sep } from 'node:path';

import { getDirname } from 'cross-dirname';

import type {
  ParsedPackageSettings,
  ParsedRepoSettings,
} from '../../settings.js';
import {
  getAllPackageSettings,
  getRepoSettings,
  markSettingsForRefresh,
} from '../../settings.js';
import { getUserPackageSettingsFromConfigFile } from '../../user.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

const MONOREPO_PROJECT_DIR = join(
  getDirname(),
  '../../../module/__test__/cache/project/monorepo'
);
const MONOREPO_PKG_ONE = join(MONOREPO_PROJECT_DIR, 'packages', 'packageOne');
const MONOREPO_PKG_TWO = join(MONOREPO_PROJECT_DIR, 'packages', 'packageTwo');
const MONOREPO_FILE_A = join(MONOREPO_PKG_ONE, 'a.ts');
const MONOREPO_FILE_C = join(MONOREPO_PKG_TWO, 'c.ts');

it('Fetchings user supplied settings', () => {
  const { packageSettings } = getAllPackageSettings({
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
  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }
  const { entryPoints, ...settings } = packageSettings;
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
    getAllPackageSettings({
      filename: FILE_A,
      settings: {},
    })
  ).toThrow(
    `eslint-plugin-fast-import settings are required in your ESLint/Oxlint config file`
  );
});

it('Throws on missing packageRootDir in settings', () => {
  expect(() =>
    getAllPackageSettings({
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
    getAllPackageSettings({
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
    getAllPackageSettings({
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
    getAllPackageSettings({
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
    getAllPackageSettings({
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
    getAllPackageSettings({
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
  const { packageSettings } = getAllPackageSettings({
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
  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }
  expect(packageSettings.fixedAliases).toEqual({});
  expect(packageSettings.wildcardAliases).toEqual({});
});

it('Supports { regexp: string } for entry point symbols', () => {
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: TEST_PROJECT_DIR,
        entryPointFiles: ['src/a.ts'],
      },
    },
  });
  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }
  const { entryPoints } = packageSettings;
  expect(entryPoints).toHaveLength(2);
  expect(entryPoints[0].file.ignores('src/a.ts')).toBeTruthy();
});

// ─── getRepoSettings: single-repo ───────────────────────────────────────────

it('Returns full single-repo structure from getRepoSettings', () => {
  const repoSettings = getRepoSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        packageRootDir: TEST_PROJECT_DIR,
        mode: 'one-shot',
      },
    },
  });

  const expected: ParsedRepoSettings = {
    type: 'singlerepo',
    mode: 'one-shot',
    editorUpdateRate: undefined,
    repoRootDir: TEST_PROJECT_DIR,
    packageSettings: {
      repoRootDir: TEST_PROJECT_DIR,
      packageRootDir: TEST_PROJECT_DIR,
    },
  };
  expect(repoSettings).toEqual(expected);
});

it('Populates package settings cache as side effect of getRepoSettings (single-repo)', () => {
  // Call getRepoSettings first (populates package settings cache as a side effect)
  getRepoSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        packageRootDir: TEST_PROJECT_DIR,
        mode: 'one-shot',
      },
    },
  });

  // getPackageSettings should now return cached settings without re-parsing
  const { packageSettings } = getAllPackageSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        packageRootDir: TEST_PROJECT_DIR,
        mode: 'one-shot',
      },
    },
  });

  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }
  expect(packageSettings.packageRootDir).toBe(TEST_PROJECT_DIR);
  expect(packageSettings.repoRootDir).toBe(TEST_PROJECT_DIR);
});

// ─── getRepoSettings: monorepo ───────────────────────────────────────────────

it('Returns monorepo structure and discovers packages from getRepoSettings', () => {
  const repoSettings = getRepoSettings({
    filename: MONOREPO_FILE_A,
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix',
      },
    },
  });

  expect(repoSettings.type).toBe('monorepo');
  expect(repoSettings.mode).toBe('fix');
  expect(repoSettings.repoRootDir).toBe(MONOREPO_PROJECT_DIR);
});

it('Populates package settings cache for packageOne after monorepo getRepoSettings', () => {
  getRepoSettings({
    filename: MONOREPO_FILE_A,
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix',
      },
    },
  });

  const { packageSettings } = getAllPackageSettings({
    filename: MONOREPO_FILE_A,
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix',
      },
    },
  });

  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }
  expect(packageSettings.packageRootDir).toBe(MONOREPO_PKG_ONE);
  expect(packageSettings.repoRootDir).toBe(MONOREPO_PROJECT_DIR);
});

it('Returns correct package settings for packageTwo via longest-prefix match', () => {
  getRepoSettings({
    filename: MONOREPO_FILE_A,
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix',
      },
    },
  });

  const { packageSettings } = getAllPackageSettings({
    filename: MONOREPO_FILE_C,
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix',
      },
    },
  });

  if (!packageSettings) {
    throw new Error('packageSettings should be defined');
  }
  expect(packageSettings.packageRootDir).toBe(MONOREPO_PKG_TWO);
  expect(packageSettings.repoRootDir).toBe(MONOREPO_PROJECT_DIR);
});

it('Returns undefined packageSettings for a file outside any known package', () => {
  getRepoSettings({
    filename: MONOREPO_FILE_A,
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix',
      },
    },
  });

  const { packageSettings } = getAllPackageSettings({
    filename: join(MONOREPO_PROJECT_DIR, 'eslint.config.js'),
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix',
      },
    },
  });

  expect(packageSettings).toBeUndefined();
});

it('Throws on relative monorepoRootDir', () => {
  expect(() =>
    getRepoSettings({
      filename: MONOREPO_FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: './foo',
        },
      },
    })
  ).toThrow(`monorepoRootDir "./foo" must be absolute`);
});

it("Throws on monorepoRootDir that doesn't exist", () => {
  expect(() =>
    getRepoSettings({
      filename: MONOREPO_FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: join(MONOREPO_PROJECT_DIR, 'fake'),
        },
      },
    })
  ).toThrow(
    `monorepoRootDir "${join(MONOREPO_PROJECT_DIR, 'fake')}" does not exist`
  );
});

it('Throws when mixing monorepoRootDir and packageRootDir in settings', () => {
  expect(() =>
    getRepoSettings({
      filename: MONOREPO_FILE_A,
      settings: {
        'fast-import': {
          monorepoRootDir: MONOREPO_PROJECT_DIR,
          packageRootDir: TEST_PROJECT_DIR,
        },
      },
    })
  ).toThrow('Invalid settings');
});

// ─── markSettingsForRefresh ──────────────────────────────────────────────────

it('markSettingsForRefresh forces a re-read of user settings (single-repo)', () => {
  const context = {
    filename: FILE_A,
    settings: {
      'fast-import': {
        packageRootDir: TEST_PROJECT_DIR,
        mode: 'fix' as string,
      },
    },
  };

  // Populate the cache; getRepoSettings returns the same object reference
  // stored in the cache, so mutating it mutates the cached value directly
  const cachedSettings = getRepoSettings(context);
  expect(cachedSettings.mode).toBe('fix');

  // Mutate the cached object in-memory
  cachedSettings.mode = 'editor';

  // The mutation is reflected because the cache still holds the same reference
  expect(getRepoSettings(context).mode).toBe('editor');

  // markSettingsForRefresh forces the next call to re-read from context.settings,
  // which still has mode: 'fix', overwriting our in-memory mutation
  markSettingsForRefresh(TEST_PROJECT_DIR);

  expect(getRepoSettings(context).mode).toBe('fix');
});

it('markSettingsForRefresh forces a re-read of user settings (monorepo)', () => {
  const context = {
    filename: MONOREPO_FILE_A,
    settings: {
      'fast-import': {
        monorepoRootDir: MONOREPO_PROJECT_DIR,
        mode: 'fix' as string,
      },
    },
  };

  // Populate the cache; same reference semantics as the single-repo case
  const cachedSettings = getRepoSettings(context);
  expect(cachedSettings.mode).toBe('fix');

  // Mutate the cached object in-memory
  cachedSettings.mode = 'editor';

  // The mutation is reflected because the cache still holds the same reference
  expect(getRepoSettings(context).mode).toBe('editor');

  // markSettingsForRefresh on a package inside the monorepo forces a re-read
  // from context.settings, which still has mode: 'fix'
  markSettingsForRefresh(MONOREPO_PKG_ONE);

  expect(getRepoSettings(context).mode).toBe('fix');
});

// ─── getUserPackageSettingsFromConfigFile ────────────────────────────────────

it('Throws a formatted error when the config file contains invalid JSON', () => {
  const configFilePath = join(TEST_PROJECT_DIR, 'invalid.config.json');
  expect(() =>
    getUserPackageSettingsFromConfigFile({
      configFilePath,
      repoRootDir: TEST_PROJECT_DIR,
    })
  ).toThrow(`Failed to parse package config file ${configFilePath}:`);
});
