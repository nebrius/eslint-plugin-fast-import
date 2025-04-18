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
  type SerializableFileEntry,
  type SerializableOptions,
} from './computeBaseInfoWorker.js';
import { getEntryPointCheck } from './getEntryPointCheck.js';
import { parseFile } from './util.js';

const ARGV_FLAG = 'computeFileDetailsInBackgroundProcess';

const DEFAULT_NUM_THREADS = 6;

if (process.argv[2] === ARGV_FLAG) {
  const start = Date.now();
  const { eslintConfigDir, entryPoints, filePaths } = JSON.parse(
    process.argv[3]
  ) as SerializableOptions;

  const workerSize = Math.floor(filePaths.length / DEFAULT_NUM_THREADS);

  let runningWorkers = DEFAULT_NUM_THREADS;
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
      process.stdout.write(JSON.stringify(message));
      process.stdout.write(PROCESS_SEPARATOR);
    });
    worker.on('exit', () => {
      runningWorkers--;
      if (!runningWorkers) {
        process.stdout.write(
          JSON.stringify({
            type: 'log',
            message: `Orchestrator: finished in ${(Date.now() - start).toString()}ms`,
          })
        );
      }
    });
  }
  process.stdout.write(PROCESS_SEPARATOR);
}

export function computeBaseFileInfoForFilesInProcess(
  options: SerializableOptions
) {
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
    const parsedResultEntry = JSON.parse(resultEntry) as WorkerMessage;
    switch (parsedResultEntry.type) {
      case 'success': {
        fileDetails.push(parsedResultEntry.fileEntry);
        break;
      }
      case 'log': {
        debug(parsedResultEntry.message);
        break;
      }
      case 'error': {
        const { error } = parsedResultEntry;
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
        break;
      }
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
