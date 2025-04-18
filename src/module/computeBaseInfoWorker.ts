import { isMainThread, parentPort, workerData } from 'node:worker_threads';

import { TSError } from '@typescript-eslint/typescript-estree';

import type { ParsedSettings } from '../settings/settings.js';
import type { BaseCodeFileDetails } from '../types/base.js';
import { InternalError } from '../util/error.js';
import { computeFileDetails } from './computeBaseFileDetails.js';
import { getEntryPointCheck } from './getEntryPointCheck.js';
import { parseFile } from './util.js';

export const PROCESS_SEPARATOR = String.fromCharCode(0x02);

export type SerializableOptions = {
  eslintConfigDir: string;
  entryPoints: ParsedSettings['entryPoints'];
  filePaths: string[];
};

export type SerializableFileEntry = {
  filePath: string;
  fileDetails: BaseCodeFileDetails;
};

export type SerializableError =
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

export type WorkerMessage =
  | {
      type: 'success';
      fileEntry: SerializableFileEntry;
    }
  | {
      type: 'error';
      error: SerializableError;
    };

function postMessage(message: WorkerMessage) {
  if (!parentPort) {
    throw new InternalError('parentPort is not available');
  }

  parentPort.postMessage(message);
}

if (!isMainThread) {
  const { eslintConfigDir, entryPoints, filePaths } =
    workerData as SerializableOptions;
  const isEntryPointCheck = getEntryPointCheck(eslintConfigDir, entryPoints);
  for (const filePath of filePaths) {
    try {
      postMessage({
        type: 'success',
        fileEntry: {
          filePath,
          fileDetails: computeFileDetails({
            ...parseFile(filePath),
            isEntryPointCheck,
          }),
        },
      });
    } catch (e) {
      if (e instanceof TSError) {
        postMessage({
          type: 'error',
          error: {
            filePath,
            errorType: 'TSError',
          },
        });
      } else if (e instanceof Error) {
        postMessage({
          type: 'error',
          error: {
            filePath,
            errorType: 'Error',
            message: e.message,
            stack: e.stack ?? null,
          },
        });
      } else {
        postMessage({
          type: 'error',
          error: {
            filePath,
            errorType: 'unknown',
          },
        });
      }
    }
    process.stdout.write(PROCESS_SEPARATOR);
  }
}
