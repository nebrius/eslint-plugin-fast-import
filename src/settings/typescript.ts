import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { warn } from '../util/logging';
import type { GenericContext } from '../types/context';
import { dirname, join } from 'node:path';
import type { Settings } from './user';

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
    : undefined;

  // TODO: read in `paths` property and resolve here

  // Fallback to the directory containing tsconfig.json if rootDir isn't
  // supplied (like TypeScript itself does)
  return { rootDir: absoluteRootDir ?? dirname(configPath) };
}
