import type { RequiredDeep } from 'type-fest';
import { getTypeScriptSettings } from './typescript';
import { error } from '../util/logging';
import type { GenericContext } from '../types/context';
import { isAbsolute, join, resolve } from 'node:path';
import { getUserSettings, type Settings } from './user';
import { getEslintConfigDir } from './util';
import { existsSync } from 'node:fs';

export type ParsedSettings = RequiredDeep<Settings>;

let settings: ParsedSettings | null = null;
export function getSettings(context: GenericContext): ParsedSettings {
  // Return the cached copy if we have it
  if (settings) {
    return settings;
  }

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
      `Could not determine rootDir. Please add it to fast-esm settings. See https://github.com/nebrius/fast-esm for details`
    );
    process.exit(-1);
  }

  // Clean up any aliases
  const parsedAlias: ParsedSettings['alias'] = {};
  for (let [symbol, path] of Object.entries(alias)) {
    if (symbol.endsWith('/')) {
      symbol = symbol.slice(0, -1);
    }
    if (!isAbsolute(path)) {
      path = resolve(join(getEslintConfigDir(context), path));
    }
    path = resolve(join(rootDir, path));
    parsedAlias[symbol] = path;
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

  // Apply defaults and save to the cache
  settings = {
    rootDir,
    alias: parsedAlias,
    entryPoints: parsedEntryPoints,
  };
  return settings;
}
