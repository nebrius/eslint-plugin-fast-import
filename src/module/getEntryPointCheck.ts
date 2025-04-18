import type { Ignore } from 'ignore';
import ignore from 'ignore';

import type { ParsedSettings } from '../settings/settings.js';

type EntryPointCheck = (filePath: string, symbolName: string) => boolean;

// eslint-disable-next-line fast-import/no-unused-exports
export function _resetEntryPointCheck() {
  entryPointCheck = undefined;
}

let entryPointCheck: EntryPointCheck | undefined;
export function getEntryPointCheck(
  eslintConfigDir: string,
  entryPoints: ParsedSettings['entryPoints']
): EntryPointCheck {
  if (entryPointCheck) {
    return entryPointCheck;
  }
  const parsedEntryPoints: Array<{ file: Ignore; symbols: string[] }> = [];
  for (const { file, symbols } of entryPoints) {
    parsedEntryPoints.push({
      file: ignore().add(file),
      symbols,
    });
  }
  entryPointCheck = (filePath: string, symbolName: string) => {
    for (const { file, symbols } of parsedEntryPoints) {
      // We're using the ignore library in reverse fashion: we're using it to
      // identify when a file is _included_, not _excluded_
      if (file.ignores(filePath.replace(eslintConfigDir + '/', ''))) {
        return symbols.includes(symbolName);
      }
    }
    return false;
  };
  return entryPointCheck;
}
