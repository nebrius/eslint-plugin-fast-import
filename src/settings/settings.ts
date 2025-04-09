import type { RequiredDeep } from 'type-fest';
import { getTypeScriptSettings } from './typescript.js';
import { debug, error } from '../util/logging.js';
import type { GenericContext } from '../types/context.js';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { getUserSettings, type Settings } from './user.js';
import { getEslintConfigDir } from './util.js';
import { existsSync } from 'node:fs';

export type IgnorePattern = {
  dir: string;
  contents: string;
};

export type ParsedSettings = Omit<
  RequiredDeep<Settings>,
  'ignorePatterns' | 'alias'
> & {
  ignorePatterns: IgnorePattern[];
  wildcardAliases: Record<string, string>;
  fixedAliases: Record<string, string>;
};

function argsInclude(strs: string[]) {
  for (const str of strs) {
    if (process.argv.some((arg) => arg.includes(str))) {
      return true;
    }
  }
  return false;
}

const DEFAULT_MODE = process.argv[0].includes('Visual Studio Code')
  ? 'editor'
  : argsInclude(['--fix', '--fix-dry-run', '--fix-type'])
    ? 'fix'
    : 'one-shot';

let settings: ParsedSettings | null = null;

// We need to reset settings between runs, since some tests try different settings
// eslint-disable-next-line fast-import/no-unused-exports
export function _resetSettings() {
  settings = null;
}

export function getSettings(context: GenericContext): ParsedSettings {
  // Return the cached copy if we have it
  if (settings) {
    return settings;
  }

  const eslintConfigDir = getEslintConfigDir(context);

  // Get TypeScript supplied settings
  const typeScriptSettings = getTypeScriptSettings(context);
  const userSettings = getUserSettings(context);
  const mergedSettings = {
    ...typeScriptSettings,
    ...userSettings,
  };

  let { rootDir } = mergedSettings;
  const { alias = {}, entryPoints = [] } = mergedSettings;

  // If we don't have rootDir yet, default to setting it to the ESLint config
  // file directory. If we do have it but it's a relative path, make it absolute
  // by joining+resolving with the ESLint config file directory.
  if (!rootDir || !isAbsolute(rootDir)) {
    const eslintConfigDir = getEslintConfigDir(context);
    if (!rootDir) {
      rootDir = eslintConfigDir;
    } else {
      rootDir = resolve(join(eslintConfigDir, rootDir));
    }
  }

  // Make sure we could find a rootDir
  if (!rootDir) {
    error(
      `Could not determine rootDir. Please add it to fast-import settings. See https://github.com/nebrius/fast-import for details`
    );
    process.exit(-1);
  }

  // Clean up any aliases
  const wildcardAliases: ParsedSettings['wildcardAliases'] = {};
  const fixedAliases: ParsedSettings['fixedAliases'] = {};
  for (let [symbol, path] of Object.entries(alias)) {
    // Compute the absolute version of the path if needed (TypeScript does this
    // already since it has different resolution rules)
    if (!isAbsolute(path)) {
      path = resolve(eslintConfigDir, path);
    }
    if (symbol.endsWith('/')) {
      symbol = symbol.slice(0, -1);
    }

    // Filter out paths that don't resolve to files inside rootDir, since they're
    // either third party or doing something not supported
    if (!path.startsWith(rootDir)) {
      continue;
    }

    // Determine if this is a wildcard or fixed alias, and validate consistency
    if (symbol.endsWith('/*')) {
      if (!path.endsWith('/*')) {
        error(`Alias path ${path} must end with "/*" when ${symbol} does`);
      }
      wildcardAliases[symbol.replace(/\*$/, '')] = path.replace(/\*$/, '');
    } else {
      if (path.endsWith('/*')) {
        error(
          `Alias path ${path} must not end with "/*" when ${symbol} does not`
        );
      }
      fixedAliases[symbol] = path;
    }
  }

  // Clean up any entry points
  const parsedEntryPoints: ParsedSettings['entryPoints'] = [];
  for (let { symbol, file } of entryPoints) {
    if (symbol.endsWith('/')) {
      symbol = symbol.slice(0, -1);
    }
    if (isAbsolute(file)) {
      error(
        `Invalid entry point file "${file}". Entry point files must be relative to rootDir, not absolute`
      );
      process.exit(-1);
    }
    file = resolve(join(rootDir, file));
    if (!existsSync(file)) {
      error(`Entry point file "${file}" does not exist`);
      process.exit(-1);
    }
    parsedEntryPoints.push({
      file,
      symbol,
    });
  }

  const mode =
    mergedSettings.mode !== 'auto' && mergedSettings.mode !== undefined
      ? mergedSettings.mode
      : DEFAULT_MODE;
  debug(`Running in ${mode} mode`);
  debug(`Setting root dir to ${rootDir}`);
  if (!Object.keys(wildcardAliases).length) {
    debug(`No wildcard aliases defined`);
  } else {
    debug(`Wildcard aliases:`);
    for (const [symbol, path] of Object.entries(wildcardAliases)) {
      debug(`  ${symbol}: ${path}`);
    }
  }
  if (!Object.keys(fixedAliases).length) {
    debug(`No fixed aliases defined`);
  } else {
    debug(`Fixed aliases:`);
    for (const [symbol, path] of Object.entries(fixedAliases)) {
      debug(`  ${symbol}: ${path}`);
    }
  }
  debug(`Entry points:`);
  for (const { file, symbol } of parsedEntryPoints) {
    debug(`  ${file.replace(eslintConfigDir + sep, '')}: ${symbol}`);
  }

  const ignorePatterns = (mergedSettings.ignorePatterns ?? []).map((p) => ({
    dir: eslintConfigDir,
    contents: `${eslintConfigDir}/${p}`,
  }));

  // Apply defaults and save to the settings cache
  settings = {
    rootDir,
    wildcardAliases,
    fixedAliases,
    entryPoints: parsedEntryPoints,
    ignorePatterns,
    editorUpdateRate: mergedSettings.editorUpdateRate ?? 5_000,
    mode,
  };
  return settings;
}
