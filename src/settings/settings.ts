import { isAbsolute, resolve } from 'node:path';

import type { Ignore } from 'ignore';
import ignore from 'ignore';

import type { GenericContext } from '../types/context.js';
import { InternalError } from '../util/error.js';
import {
  getMonorepoPackageSettings,
  trimTrailingPathSeparator,
} from '../util/files.js';
import { getSubpathEntry } from '../util/getSubpathEntry.js';
import { debug } from '../util/logging.js';
import { getTypeScriptSettings } from './typescript.js';
import type { PackageSettings, RepoUserSettings } from './user.js';
import {
  getUserPackageSettingsFromConfigFile,
  getUserRepoSettings,
} from './user.js';

export type IgnorePattern = {
  dir: string;
  contents: string;
};

export type ParsedPackageSettings = Omit<
  PackageSettings,
  | 'ignorePatterns'
  | 'ignoreOverridePatterns'
  | 'wildcardAliases'
  | 'fixedAliases'
  | 'entryPoints'
  | 'testFilePatterns'
> & {
  ignorePatterns: IgnorePattern[];
  ignoreOverridePatterns: IgnorePattern[];
  wildcardAliases: Record<string, string>;
  fixedAliases: Record<string, string>;
  entryPoints: Array<{ file: Ignore }>;
  testFilePatterns: string[];
};

export type ParsedRepoSettings = Exclude<RepoUserSettings, 'mode'> & {
  mode: 'editor' | 'fix' | 'one-shot';
};

// Honestly the process.argv stuff isn't worth the effort to test, since it
// involves mocking process.argv, which is a pain.
/* instanbul ignore next */
function argsInclude(strs: string[]) {
  for (const str of strs) {
    if (process.argv.some((arg) => arg.includes(str))) {
      return true;
    }
  }
  return false;
}
/* instanbul ignore next */
const DEFAULT_MODE =
  process.argv[0].includes('Visual Studio Code') ||
  process.argv[0].includes('Cursor') ||
  process.argv[0].includes('Windsurf')
    ? 'editor'
    : argsInclude(['--fix', '--fix-dry-run', '--fix-type'])
      ? 'fix'
      : 'one-shot';

const packageSettingsCache = new Map<
  string,
  { settings: ParsedPackageSettings }
>();

const repoSettingsCache = new Map<
  string,
  { settings: ParsedRepoSettings; refresh: boolean }
>();

// Used for tests
// eslint-disable-next-line fast-import/no-unused-exports
export function _resetAllSettings() {
  packageSettingsCache.clear();
  repoSettingsCache.clear();
}

// Used when settings files have changed in editor mode
export function markSettingsForRefresh(packageRootDir: string) {
  const packageCacheEntry = packageSettingsCache.get(packageRootDir);
  if (packageCacheEntry) {
    const repoCacheEntry = repoSettingsCache.get(
      packageCacheEntry.settings.repoRootDir
    );
    /* instanbul ignore next */
    if (!repoCacheEntry) {
      throw new InternalError(
        'Could not get repo cache settings from package cache settings'
      );
    }
    repoSettingsCache.set(packageRootDir, {
      settings: repoCacheEntry.settings,
      refresh: true,
    });
  }
}

function compareSettingsObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown> | undefined
) {
  return !!b && JSON.stringify(a) === JSON.stringify(b);
}

export function getRepoSettings(
  context: Pick<GenericContext, 'filename' | 'settings'>
): ParsedRepoSettings {
  let cachedSettings: ParsedRepoSettings | undefined;
  let needsRefresh = false;
  const cachedRepoEntry = getRepoCacheEntryForFile(context.filename);
  if (cachedRepoEntry) {
    cachedSettings = cachedRepoEntry.settings;
    needsRefresh = cachedRepoEntry.refresh;
  }
  if (cachedSettings && !needsRefresh) {
    return cachedSettings;
  }

  const { mode: rawMode, ...rest } = getUserRepoSettings(context.settings);

  const mode =
    rawMode === 'auto' || rawMode === undefined ? DEFAULT_MODE : rawMode;
  if (cachedSettings?.mode !== mode) {
    if (cachedSettings) {
      debug(`Mode change from ${cachedSettings.mode} to ${mode}`);
    } else {
      debug(`Running in ${mode} mode`);
    }
  }

  const repoSettings: ParsedRepoSettings = {
    ...rest,
    mode,
  };
  repoSettingsCache.set(rest.repoRootDir, {
    settings: repoSettings,
    refresh: false,
  });

  // If we're in single repo mode, we need to also parse and store the
  // package settings here
  if (rest.type === 'singlerepo') {
    populatePackageSettingsCache(rest.packageSettings);
  } else {
    const packageConfigFiles = getMonorepoPackageSettings(rest.repoRootDir);
    for (const packageConfigFile of packageConfigFiles) {
      const packageSettings = getUserPackageSettingsFromConfigFile({
        repoRootDir: rest.repoRootDir,
        configFilePath: packageConfigFile,
      });
      populatePackageSettingsCache(packageSettings);
    }
  }

  return repoSettings;
}

// Gets all known package settings. This takes into account the current file
// being linted so that we can detect if we're in an editor and a new package
// was just added. This also refreshes the cache after invalidation.
export function getAllPackageSettings(
  context: Pick<GenericContext, 'filename' | 'settings'>
) {
  // First we check if this file has a cached entry or not
  const cachedRepoEntry = getRepoCacheEntryForFile(context.filename);
  if (cachedRepoEntry && !cachedRepoEntry.refresh) {
    // If we got here, then that means we're eligible to use the cached copy of
    // the package settings, if it exists.
    const cachedPackageEntry = getPackageCacheEntryForFile(context.filename);
    if (cachedPackageEntry) {
      const packageSettings = getPackageCacheEntryForFile(context.filename);
      /* istanbul ignore if */
      if (!packageSettings) {
        throw new InternalError(
          'Current package settings is unexpectedly undefined'
        );
      }
      return {
        allPackageSettings: getAllPackageCacheEntries(),
        packageSettings,
      };
    }
    // If we got here, that means that this is a new package since the last
    // time we computed repo settings, which necessitates recomputing the entire
    // repo settings.
  }

  // Calling this will repopulate the repo settings cache and the cache for this
  // package' settings, as well as repo settings. We don't need the return value
  // here, but we do need the side effects.
  getRepoSettings(context);

  // We're now guaranteed to have the latest package settings, since they're
  // computed as part of the repo settings computation.
  const allPackageSettings = getAllPackageCacheEntries();
  const packageSettings = getPackageCacheEntryForFile(context.filename);
  /* istanbul ignore if */
  if (!packageSettings) {
    throw new InternalError(
      'Current package settings is unexpectedly undefined'
    );
  }
  return { allPackageSettings, packageSettings };
}

function populatePackageSettingsCache(userPackageSettings: PackageSettings) {
  // Get TypeScript supplied settings
  const typeScriptSettings = getTypeScriptSettings(
    userPackageSettings.packageRootDir
  );

  // Merge TypeScript and user settings, with user settings taking precedence
  const mergedSettings = {
    ...typeScriptSettings,
    ...userPackageSettings,
  };

  const {
    alias = {},
    entryPointFiles = [],
    externallyImportedFiles = [],
  } = mergedSettings;

  // Clean up any aliases
  const wildcardAliases: ParsedPackageSettings['wildcardAliases'] = {};
  const fixedAliases: ParsedPackageSettings['fixedAliases'] = {};
  const { packageRootDir } = userPackageSettings;
  for (let [symbol, path] of Object.entries(alias)) {
    // Compute the absolute version of the path if needed (TypeScript does this
    // already since it has different resolution rules)
    if (!isAbsolute(path)) {
      path = resolve(packageRootDir, path);
    }
    symbol = trimTrailingPathSeparator(symbol);

    // Filter out paths that don't resolve to files inside packageRootDir, since
    // they're either third party or doing something not supported
    if (!path.startsWith(packageRootDir)) {
      continue;
    }

    // Determine if this is a wildcard or fixed alias, and validate consistency
    if (symbol.endsWith('*')) {
      if (!path.endsWith('*')) {
        throw new Error(
          `Alias path ${path} must end with "*" when ${symbol} ends with "*"`
        );
      }
      wildcardAliases[symbol.replace(/\*$/, '')] = path.replace(/\*$/, '');
    } else {
      if (path.endsWith('*')) {
        throw new Error(
          `Alias path ${path} must not end with "*" when ${symbol} does not end with "*"`
        );
      }
      fixedAliases[symbol] = path;
    }
  }

  // Clean up any entry points
  const parsedEntryPoints: ParsedPackageSettings['entryPoints'] = [];
  // Merge entry points and externally imported exports, since they mean the
  // same thing from inside the module. They are kept separate in settings for
  // use by monorepo package analysis rules (aka outside the module)
  for (const filePattern of [
    ...entryPointFiles,
    ...externallyImportedFiles,

    // Always ignore config files in the root directory
    '/*.config.*',
  ]) {
    parsedEntryPoints.push({
      file: ignore().add(filePattern),
    });
  }

  const cachedSettings = packageSettingsCache.get(packageRootDir)?.settings;
  if (cachedSettings?.packageRootDir !== packageRootDir) {
    if (cachedSettings) {
      debug(
        `Package root dir change from ${cachedSettings.packageRootDir} to ${packageRootDir}`
      );
    } else {
      debug(`Setting package root dir to ${packageRootDir}`);
    }
  }

  if (
    !compareSettingsObjects(wildcardAliases, cachedSettings?.wildcardAliases)
  ) {
    if (cachedSettings) {
      debug(`Wildcard aliases changed`);
    }
    if (!Object.keys(wildcardAliases).length) {
      debug(`No wildcard aliases defined`);
    } else {
      debug(`Wildcard aliases:`);
      for (const [symbol, path] of Object.entries(wildcardAliases)) {
        debug(`  ${symbol}: ${path}`);
      }
    }
  }

  if (!compareSettingsObjects(fixedAliases, cachedSettings?.fixedAliases)) {
    if (cachedSettings) {
      debug(`Fixed aliases changed`);
    }
    if (!Object.keys(fixedAliases).length) {
      debug(`No fixed aliases defined`);
    } else {
      debug(`Fixed aliases:`);
      for (const [symbol, path] of Object.entries(fixedAliases)) {
        debug(`  ${symbol}: ${path}`);
      }
    }
  }

  const ignorePatterns = (mergedSettings.ignorePatterns ?? []).map((p) => ({
    dir: packageRootDir,
    contents: p,
  }));

  const ignoreOverridePatterns = (
    mergedSettings.ignoreOverridePatterns ?? []
  ).map((p) => ({
    dir: packageRootDir,
    contents: p,
  }));

  // Apply defaults and save to the settings cache
  const newSettings: ParsedPackageSettings = {
    repoRootDir: mergedSettings.repoRootDir,
    packageRootDir,
    wildcardAliases,
    fixedAliases,
    entryPoints: parsedEntryPoints,
    ignorePatterns,
    ignoreOverridePatterns,
    testFilePatterns: mergedSettings.testFilePatterns ?? [],
  };
  packageSettingsCache.set(packageRootDir, {
    settings: newSettings,
  });
}

function getRepoCacheEntryForFile(filePath: string) {
  return getSubpathEntry({
    filePath,
    data: repoSettingsCache,
  });
}

export function getPackageCacheEntryForFile(filePath: string) {
  const result = getSubpathEntry({
    filePath,
    data: packageSettingsCache,
  });
  return result?.settings;
}

function getAllPackageCacheEntries() {
  return Array.from(
    packageSettingsCache.entries().map(([, { settings }]) => settings)
  );
}
