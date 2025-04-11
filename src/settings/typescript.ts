import ts from 'typescript';
import { existsSync, readFileSync } from 'node:fs';
import { warn } from '../util/logging.js';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { Settings } from './user.js';
import { getEslintConfigDir } from './util.js';

export function getTypeScriptSettings(filePath: string): Settings {
  // Read in the file. Note: we don't support the full breadth of tsconfigs,
  // notably we don't support multiple nested configs and only look at the
  // config found in the eslint config file's directory
  const configPath = ts.findConfigFile(
    getEslintConfigDir(filePath),
    ts.sys.fileExists.bind(ts.sys),
    'tsconfig.json'
  );
  if (!configPath) {
    return {};
  }

  const settings = parseTsConfig(configPath);
  return {
    rootDir: settings.rootDir ?? dirname(configPath),
    alias: settings.alias,
  };
}

function parseTsConfig(configPath: string): Settings {
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
  const configExtends = config.config?.extends as string | undefined;
  let baseConfig: Settings = {};
  if (typeof configExtends === 'string') {
    baseConfig = parseTsConfig(resolve(dirname(configPath), configExtends));
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const rootDir = config.config?.compilerOptions?.rootDir as string | undefined;
  const absoluteRootDir = rootDir && join(dirname(configPath), rootDir);

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
    if (!existsSync(absolutePathEntry.replace('/*', ''))) {
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

  // Fallback to the directory containing tsconfig.json if rootDir isn't
  // supplied (like TypeScript itself does)
  return {
    rootDir: absoluteRootDir ?? baseConfig.rootDir,
    alias: { ...parsedPaths, ...baseConfig.alias },
  };
}
