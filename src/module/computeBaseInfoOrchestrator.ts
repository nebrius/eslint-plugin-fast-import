import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import { TSError } from '@typescript-eslint/typescript-estree';
import { getDirname, getFilename } from 'cross-dirname';

import type { BaseCodeFileDetails } from '../types/base.js';
import { debug } from '../util/logging.js';
import { computeFileDetails } from './computeBaseFileDetails.js';
import type { WorkerMessage } from './computeBaseInfoWorker.js';
import {
  PROCESS_SEPARATOR,
  type SerializableError,
  type SerializableFileEntry,
  type SerializableOptions,
} from './computeBaseInfoWorker.js';
import { getEntryPointCheck } from './getEntryPointCheck.js';
import { parseFile } from './util.js';

const ARGV_FLAG = 'computeFileDetailsInBackgroundProcess';

const DEFAULT_NUM_THREADS = 6;

if (process.argv[2] === ARGV_FLAG) {
  const { eslintConfigDir, entryPoints, filePaths } = JSON.parse(
    process.argv[3]
  ) as SerializableOptions;

  const workerSize = Math.floor(filePaths.length / DEFAULT_NUM_THREADS);

  for (let i = 0; i < DEFAULT_NUM_THREADS; i++) {
    const filePathsForWorker =
      i === DEFAULT_NUM_THREADS - 1
        ? filePaths.slice(i * workerSize)
        : filePaths.slice(i * workerSize, (i + 1) * workerSize);
    const worker = new Worker(join(getDirname(), 'computeBaseInfoWorker.js'), {
      workerData: {
        eslintConfigDir,
        entryPoints,
        filePaths: filePathsForWorker,
      },
    });
    worker.on('message', (message: WorkerMessage) => {
      if (message.type === 'error') {
        process.stdout.write(JSON.stringify(message.error));
      } else {
        process.stdout.write(JSON.stringify(message.fileEntry));
      }
      process.stdout.write(PROCESS_SEPARATOR);
    });
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
