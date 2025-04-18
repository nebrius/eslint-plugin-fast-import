import { readFileSync } from 'node:fs';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';

import { parse, TSError } from '@typescript-eslint/typescript-estree';

import type { ParsedSettings } from '../settings/settings.js';
import type { BaseCodeFileDetails } from '../types/base.js';
import { InternalError } from '../util/error.js';
import { computeFileDetails } from './computeBaseFileDetails.js';
import { getEntryPointCheck } from './getEntryPointCheck.js';

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

export type WorkerMessage =
  | {
      type: 'success';
      fileEntry: SerializableFileEntry;
    }
  | {
      type: 'error';
      error: SerializableError;
    }
  | {
      type: 'log';
      message: string;
    };

function postMessage(message: WorkerMessage) {
  if (!parentPort) {
    throw new InternalError('parentPort is not available');
  }

  parentPort.postMessage(message);
}

if (!isMainThread) {
  const start = Date.now();
  const { eslintConfigDir, entryPoints, filePaths } =
    workerData as SerializableOptions;
  const isEntryPointCheck = getEntryPointCheck(eslintConfigDir, entryPoints);
  let filDetailsSum = 0;
  for (const filePath of filePaths) {
    try {
      const fileContents = readFileSync(filePath, 'utf-8');
      const filDetailsStart = Date.now();
      const ast = parse(fileContents, {
        loc: true,
        range: true,
        tokens: true,

        // JSX is a proper superset of JavaScript, meaning JSX can appear in both
        // .js and .jsx files. TSX is *not* a proper superset of TypeScript,
        // however, and so JSX can only appear in .tsx files, not .ts files
        jsx: !filePath.endsWith('.ts'),
      });
      filDetailsSum += Date.now() - filDetailsStart;
      const fileDetails = computeFileDetails({
        fileContents,
        ast,
        filePath,
        isEntryPointCheck,
      });
      postMessage({
        type: 'success',
        fileEntry: {
          filePath,
          fileDetails,
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
  postMessage({
    type: 'log',
    message: `Worker: finished processing ${filePaths.length.toString()} files in ${(
      Date.now() - start
    ).toString()}ms (inner sum=${filDetailsSum.toString()}ms)`,
  });
}
