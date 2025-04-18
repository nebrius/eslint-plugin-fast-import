import { spawnSync } from 'node:child_process';

import { TSError } from '@typescript-eslint/typescript-estree';
import { getDirname, getFilename } from 'cross-dirname';

import type { ParsedSettings } from '../settings/settings.js';
import type { BaseCodeFileDetails } from '../types/base.js';
import { debug } from '../util/logging.js';
import { computeFileDetails } from './computeBaseFileDetails.js';
import { getEntryPointCheck } from './getEntryPointCheck.js';
import { parseFile } from './util.js';

const PROCESS_SEPARATOR = String.fromCharCode(0x02);
const ARGV_FLAG = 'computeFileDetailsInBackgroundProcess';

type SerializableOptions = {
  eslintConfigDir: string;
  entryPoints: ParsedSettings['entryPoints'];
  filePaths: string[];
};

type SerializableFileEntry = {
  filePath: string;
  fileDetails: BaseCodeFileDetails;
};

type SerializableError =
  | {
      filePath: string;
      errorType: 'TSError';
    }
  | {
      filePath: string;
      errorType: 'Error';
      message: Error['message'];
      stack: Required<Error['stack']> | null;
    }
  | {
      filePath: string;
      errorType: 'unknown';
    };

if (process.argv[2] === ARGV_FLAG) {
  const { eslintConfigDir, entryPoints, filePaths } = JSON.parse(
    process.argv[3]
  ) as SerializableOptions;
  const isEntryPointCheck = getEntryPointCheck(eslintConfigDir, entryPoints);
  for (const filePath of filePaths) {
    try {
      const entry: SerializableFileEntry = {
        filePath,
        fileDetails: computeFileDetails({
          ...parseFile(filePath),
          isEntryPointCheck,
        }),
      };
      process.stdout.write(JSON.stringify(entry));
    } catch (e) {
      if (e instanceof TSError) {
        const error: SerializableError = {
          filePath,
          errorType: 'TSError',
        };
        process.stdout.write(JSON.stringify(error));
      } else if (e instanceof Error) {
        const error: SerializableError = {
          filePath,
          errorType: 'Error',
          message: e.message,
          stack: e.stack ?? null,
        };
        process.stdout.write(JSON.stringify(error));
      } else {
        const error: SerializableError = {
          filePath,
          errorType: 'unknown',
        };
        process.stdout.write(JSON.stringify(error));
      }
    }
    process.stdout.write(PROCESS_SEPARATOR);
  }
}

export function computeBaseFileInfoForFilesInProcess(
  options: SerializableOptions
): SerializableFileEntry[] {
  const results = spawnSync(
    'node',
    [getFilename(), ARGV_FLAG, JSON.stringify(options)],
    {
      encoding: 'utf-8',
      maxBuffer: 100_000_000,
      cwd: getDirname(),
    }
  );

  const resultEntries = results.stdout.split(PROCESS_SEPARATOR);
  const fileDetails: SerializableFileEntry[] = [];
  for (const resultEntry of resultEntries) {
    if (!resultEntry) {
      continue;
    }
    try {
      const parsedResultEntry = JSON.parse(resultEntry) as Record<
        string,
        unknown
      >;
      if (parsedResultEntry.errorType) {
        const error = parsedResultEntry as SerializableError;
        switch (error.errorType) {
          case 'TSError': {
            debug(`Could not parse ${error.filePath}, file will be ignored`);
            break;
          }
          case 'Error': {
            const errorToThrow = new Error(error.message);
            if (error.stack) {
              errorToThrow.stack = error.stack;
            }
            throw errorToThrow;
          }
          case 'unknown': {
            throw new Error(
              `An unknown error was encountered while processing file details in background process`
            );
          }
        }
      } else {
        fileDetails.push(parsedResultEntry as SerializableFileEntry);
      }
    } catch {
      console.log(resultEntry);
    }
  }

  return fileDetails;
}

export function computeBaseFileInfoForFilesSync({
  eslintConfigDir,
  entryPoints,
  filePaths,
}: SerializableOptions) {
  const isEntryPointCheck = getEntryPointCheck(eslintConfigDir, entryPoints);
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
