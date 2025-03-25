import { dirname, join, resolve } from 'node:path';
import type { GenericContext } from '../types/context';
import { readdirSync } from 'node:fs';
import { error } from '../util/logging';

let eslintConfigDir: string | undefined;
export function getEslintConfigDir(context: GenericContext) {
  if (typeof eslintConfigDir !== 'undefined') {
    return eslintConfigDir;
  }
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
      eslintConfigDir = currentDir;
      return eslintConfigDir;
    }

    // Move up a level
    const nextPath = resolve(join(currentDir, '..'));
    if (currentDir === nextPath) {
      break;
    }
    currentDir = nextPath;
  }

  error(
    'Could not find flat ESLint config file. This library is only designed to work with ESLint 9+'
  );
  process.exit(-1);
}
