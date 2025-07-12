import { isAbsolute, resolve } from 'node:path';

import type { Ignore } from 'ignore';
import ignore from 'ignore';
import type { RequiredDeep } from 'type-fest';

import type { GenericContext } from '../types/context.js';
import { trimTrailingPathSeparator } from '../util/files.js';
import { debug, warn } from '../util/logging.js';
import { getTypeScriptSettings } from './typescript.js';
import { getUserSettings, type Settings } from './user.js';

export type IgnorePattern = {
  dir: string;
  contents: string;
};

export type ParsedSettings = Omit<
  RequiredDeep<Settings>,
  'ignorePatterns' | 'alias' | 'entryPoints'
> & {
  ignorePatterns: IgnorePattern[];
  wildcardAliases: Record<string, string>;
  fixedAliases: Record<string, string>;
  entryPoints: Array<{ file: Ignore; symbols: string[] | RegExp }>;
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

let settings: ParsedSettings | null = null;

// Used for tests and when settings files have changed in editor mode
export function resetSettings() {
  settings = null;
}

export function getSettings(
  context: Pick<GenericContext, 'filename' | 'settings'>
): ParsedSettings {
  // Return the cached copy if we have it
  if (settings) {
    return settings;
  }

  // Get user supplied settings first, since we need rootDir from it to proceed
  const userSettings = getUserSettings(context.settings);
  const { rootDir } = userSettings;

  // Get TypeScript supplied settings
  const typeScriptSettings = getTypeScriptSettings(userSettings.rootDir);

  // Merge TypeScript and user settings, with user settings taking precedence
  const mergedSettings = {
    ...typeScriptSettings,
    ...userSettings,
  };
  const { alias = {}, entryPoints = [] } = mergedSettings;

  // Clean up any aliases
  const wildcardAliases: ParsedSettings['wildcardAliases'] = {};
  const fixedAliases: ParsedSettings['fixedAliases'] = {};
  for (let [symbol, path] of Object.entries(alias)) {
    // Compute the absolute version of the path if needed (TypeScript does this
    // already since it has different resolution rules)
    if (!isAbsolute(path)) {
      path = resolve(rootDir, path);
    }
    symbol = trimTrailingPathSeparator(symbol);

    // Filter out paths that don't resolve to files inside rootDir, since they're
    // either third party or doing something not supported
    if (!path.startsWith(rootDir)) {
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
  const parsedEntryPoints: ParsedSettings['entryPoints'] = [];
  for (const [filePattern, symbols] of Object.entries(entryPoints)) {
    const formattedSymbols = Array.isArray(symbols)
      ? symbols.map((symbol) => trimTrailingPathSeparator(symbol))
      : symbols;

    if (isAbsolute(filePattern)) {
      warn(
        `Invalid entry point file patter "${filePattern}". Entry point files patterns must be relative to the directory with your ESLint config file, not absolute. This entry point will be ignored.`
      );
      continue;
    }
    parsedEntryPoints.push({
      file: ignore().add(filePattern),
      symbols: formattedSymbols,
    });
  }

  mergedSettings.mode = mergedSettings.mode ?? 'auto';
  const mode =
    mergedSettings.mode === 'auto' ? DEFAULT_MODE : mergedSettings.mode;
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
  for (const [filePattern, symbols] of Object.entries(entryPoints)) {
    debug(`  ${filePattern}:`);
    if (Array.isArray(symbols)) {
      for (const symbol of symbols) {
        debug(`    ${symbol}`);
      }
    } else {
      debug(`    ${symbols.toString()}`);
    }
  }

  const ignorePatterns = (mergedSettings.ignorePatterns ?? []).map((p) => ({
    dir: rootDir,
    contents: p,
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
