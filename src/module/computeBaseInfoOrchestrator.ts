import { TSError } from '@typescript-eslint/typescript-estree';

import type { BaseCodeFileDetails } from '../types/base.js';
import { debug } from '../util/logging.js';
import { computeFileDetails } from './computeBaseFileDetails.js';
import { parseFile } from './util.js';

type IsEntryPointCheck = (filePath: string, symbolName: string) => boolean;

export function computeBaseFileInfoForFilesSync(
  filePaths: string[],
  isEntryPointCheck: IsEntryPointCheck
) {
  const fileDetails: Array<{
    filePath: string;
    fileDetails: BaseCodeFileDetails;
  }> = [];
  for (const filePath of filePaths) {
    try {
      fileDetails.push({
        filePath,
        fileDetails: computeFileDetails({
          ...parseFile(filePath),
          isEntryPointCheck,
        }),
      });
    } catch (e) {
      // If we failed to parse due to a syntax error, fail silently so we can
      // continue parsing and not fail linting on all files
      if (e instanceof TSError) {
        debug(`Could not parse ${filePath}, file will be ignored`);
        continue;
      }
      throw e;
    }
  }
  return fileDetails;
}
