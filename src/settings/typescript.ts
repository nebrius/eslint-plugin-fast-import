import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import ts from 'typescript';

import { warn } from '../util/logging.js';
import type { Settings } from './user.js';

type TypeScriptSettings = Pick<Settings, 'alias'>;

export function getTypeScriptSettings(rootDir: string): TypeScriptSettings {
  // Read in the file. Note: we don't support the full breadth of tsconfigs,
  // notably we don't support multiple nested configs and only look at the
  // config found in the eslint config file's directory
  const configPath = ts.findConfigFile(
    rootDir,
    ts.sys.fileExists.bind(ts.sys),
    'tsconfig.json'
  );
  // Since we've got a tsconfig.json file for this repo, it's not actually
  // possible to test this code path
  /* istanbul ignore if */
  if (!configPath) {
    return {};
  }

  return parseTsConfig(configPath);
}

function parseTsConfig(
  configPath: string,
  projectRootDir?: string
): TypeScriptSettings {
  const config = ts.readConfigFile(configPath, (file) =>
    readFileSync(file, 'utf-8')
  );

  // Handle errors in reading the file
  if (config.error) {
    // Technically there could be multiple errors in a chain, but we pretend as
    // if there's only one, since users will have other, more detailed errors in
    // their editor
    const errorText =
      typeof config.error.messageText === 'string'
        ? config.error.messageText
        : config.error.messageText.messageText;
    warn(
      `Could not load TypeScript config, skipping settings analysis:\n  ${errorText}`
    );
    return {};
  }

  // I'm pretty sure this is impossible since we already checked error above,
  // and the TS types for config are just too loose, but check just in case
  /* istanbul ignore if */
  if (!config.config) {
    warn(
      `Could not load TypeScript config, skipping settings analysis:\n  empty config`
    );
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const rootDir = config.config?.compilerOptions?.rootDir as string | undefined;
  const absoluteRootDir =
    projectRootDir ?? (rootDir && join(dirname(configPath), rootDir));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const configExtends = config.config?.extends as string | undefined;
  let baseConfig: TypeScriptSettings = {};
  if (typeof configExtends === 'string') {
    // Check if this is a relative path or package path
    if (configExtends.startsWith('.')) {
      baseConfig = parseTsConfig(
        resolve(dirname(configPath), configExtends),
        absoluteRootDir
      );
    } else {
      // Package path - resolve using Node.js module resolution
      const require = createRequire(configPath);
      try {
        const resolvedPath = require.resolve(configExtends);
        baseConfig = parseTsConfig(resolvedPath, absoluteRootDir);
      } catch {
        warn(`Could not resolve tsconfig extends path "${configExtends}"`);
      }
    }
  }

  let baseUrl =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (config.config?.compilerOptions?.baseUrl as string | undefined) ??
    dirname(configPath);

  if (!isAbsolute(baseUrl)) {
    baseUrl = resolve(dirname(configPath), baseUrl);
  }

  const paths =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (config.config?.compilerOptions?.paths as
      | Record<string, string[]>
      | undefined) ?? {};

  const parsedPaths: Record<string, string> = {};
  for (const [symbol, path] of Object.entries(paths)) {
    if (path.length !== 1) {
      warn(
        `fast-import only supports tsconfig.compilerOptions.paths entries with exactly one path. ${symbol} will be ignored.`
      );
      continue;
    }

    const absolutePathEntry = resolve(baseUrl, path[0]);
    if (!existsSync(absolutePathEntry.replace('*', ''))) {
      throw new Error(
        `tsconfig path "${path[0]}", resolved as "${absolutePathEntry}", does not exist`
      );
    }
    if (
      !absolutePathEntry.startsWith(absoluteRootDir ?? dirname(configPath)) ||
      absolutePathEntry.includes('node_modules')
    ) {
      continue;
    }

    parsedPaths[symbol] = absolutePathEntry;
  }

  return {
    alias: { ...parsedPaths, ...baseConfig.alias },
  };
}
