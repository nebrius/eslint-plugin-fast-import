import type { RequiredDeep } from 'type-fest';
import { getTypeScriptSettings } from './typescript';
import { error } from '../util/logging';
import type { GenericContext } from '../types/context';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { getUserSettings, type Settings } from './user';

type ParsedSettings = RequiredDeep<Settings>;

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
  const { paths = {}, allowAliaslessRootImports, entryPoints } = mergedSettings;

  // If we don't have rootDir yet, default to setting it to the ESLint config
  // file directory. If we do have it but it's a relative path, make it absolute
  // by joining+resolving with the ESLint config file directory.
  if (!rootDir || !isAbsolute(rootDir)) {
    let currentDir = dirname(context.filename);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const dirContents = readdirSync(currentDir);
      if (
        dirContents.includes('eslint.config.js') ||
        dirContents.includes('eslint.config.mjs') ||
        dirContents.includes('eslint.config.cjs') ||
        dirContents.includes('eslint.config.ts') ||
        dirContents.includes('eslint.config.mjs') ||
        dirContents.includes('eslint.config.mts') ||
        dirContents.includes('eslint.config.cts')
      ) {
        if (!rootDir) {
          rootDir = currentDir;
        } else {
          rootDir = resolve(join(currentDir, rootDir));
        }
        break;
      }

      // Move up a level
      const nextPath = resolve(join(currentDir, '..'));
      if (currentDir === nextPath) {
        break;
      }
      currentDir = nextPath;
    }
  }

  // Make sure we could get a rootDir
  if (!rootDir) {
    error(`Could not determine rootDir`);
    process.exit(-1);
  }

  // Slice off any trailing commas in path and validate alias paths
  const parsedPaths: Record<string, string> = {};
  for (let [alias, path] of Object.entries(paths)) {
    if (alias.endsWith('/')) {
      alias = alias.slice(0, -1);
    }
    if (!path.startsWith('./')) {
      error(`Invalid alias path "${path}". Alias paths must start with "./"`);
      process.exit(-1);
    }
    path = resolve(join(rootDir, path));
    parsedPaths[alias] = path;
  }

  // Apply defaults and save to the cache
  settings = {
    rootDir,
    paths,
    allowAliaslessRootImports: allowAliaslessRootImports ?? false,
    entryPoints: entryPoints ?? [],
  };
  return settings;
}
