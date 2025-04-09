import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { warn } from '../util/logging.js';
import type { GenericContext } from '../types/context.js';
import { dirname, join, resolve } from 'node:path';
import type { Settings } from './user.js';

export function getTypeScriptSettings(context: GenericContext): Settings {
  // Read in the file
  const configPath = ts.findConfigFile(
    dirname(context.filename),
    ts.sys.fileExists.bind(ts.sys),
    'tsconfig.json'
  );
  if (!configPath) {
    return {};
  }
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
  if (!config.config) {
    warn(
      `Could not load TypeScript config, skipping settings analysis:\n  empty config`
    );
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const rootDir = config.config?.compilerOptions?.rootDir as string | undefined;
  const absoluteRootDir = rootDir
    ? join(dirname(configPath), rootDir)
    : dirname(configPath);

  const baseUrl =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (config.config?.compilerOptions?.baseUrl as string | undefined) ??
    dirname(configPath);

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
    const pathEntry = path[0];
    if (!pathEntry.startsWith('./')) {
      warn(
        `fast-import only supports tsconfig.compilerOptions.paths that start with "./". ${symbol} will be ignored.`
      );
    }

    const absolutePathEntry = resolve(baseUrl, pathEntry);
    if (
      !absolutePathEntry.startsWith(absoluteRootDir) ||
      absolutePathEntry.includes('node_modules')
    ) {
      continue;
    }

    parsedPaths[symbol] = absolutePathEntry;
  }

  // Fallback to the directory containing tsconfig.json if rootDir isn't
  // supplied (like TypeScript itself does)
  return { rootDir: absoluteRootDir, alias: parsedPaths };
}
