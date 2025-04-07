import type {
  AnalyzedImport,
  AnalyzedProjectInfo,
  AnalyzedReexport,
} from '../types/analyzed.js';
import { computeAnalyzedInfo } from './computeAnalyzedInfo.js';
import {
  addResolvedInfoForFile,
  computeFolderTree,
  computeResolvedInfo,
  deleteResolvedInfoForFile,
  updateResolvedInfoForFile,
} from './computeResolvedInfo.js';
import {
  addBaseInfoForFile,
  computeBaseInfo,
  deleteBaseInfoForFile,
  updateBaseInfoForFile,
} from './computeBaseInfo.js';
import { InternalError } from '../util/error.js';
import type { BaseProjectInfo } from '../types/base.js';
import type { ResolvedProjectInfo } from '../types/resolved.js';
import type { ParsedSettings } from '../settings/settings.js';
import { debug, formatMilliseconds } from '../util/logging.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { parseFile } from './util.js';

let baseProjectInfo: BaseProjectInfo | null = null;
let resolvedProjectInfo: ResolvedProjectInfo | null = null;
let analyzedProjectInfo: AnalyzedProjectInfo | null = null;

function getEntryPointCheck(entryPoints: ParsedSettings['entryPoints']) {
  return (filePath: string, symbolName: string) =>
    entryPoints.some(
      ({ file, symbol }) => file === filePath && symbol === symbolName
    );
}

// We need to reset settings between runs, since some tests try different settings
// eslint-disable-next-line fast-esm/no-unused-exports
export function _resetProjectInfo() {
  baseProjectInfo = null;
  resolvedProjectInfo = null;
  analyzedProjectInfo = null;
}

export function initializeProject({
  rootDir,
  alias,
  entryPoints,
}: ParsedSettings) {
  // If we've already analyzed the project and settings haven't changed, bail
  if (analyzedProjectInfo) {
    return;
  }

  const baseStart = Date.now();
  baseProjectInfo = computeBaseInfo({
    rootDir,
    alias,
    isEntryPointCheck: getEntryPointCheck(entryPoints),
  });
  const baseEnd = Date.now();

  const resolveStart = Date.now();
  resolvedProjectInfo = computeResolvedInfo(baseProjectInfo);
  const resolveEnd = Date.now();

  const analyzestart = Date.now();
  analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
  const analyzeEnd = Date.now();

  debug(`Initial computation complete:`);
  debug(`  total:         ${formatMilliseconds(analyzeEnd - baseStart)}`);
  debug(`  base info:     ${formatMilliseconds(baseEnd - baseStart)}`);
  debug(`  resolved info: ${formatMilliseconds(resolveEnd - resolveStart)}`);
  debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - analyzestart)}`);
}

export function getProjectInfo() {
  if (!analyzedProjectInfo) {
    throw new InternalError('Project info requested before initialization');
  }
  return analyzedProjectInfo;
}

type Changes = {
  added: Array<{
    filePath: string;
    latestUpdatedAt: number;
  }>;
  deleted: string[];
  modified: Array<{
    filePath: string;
    latestUpdatedAt: number;
  }>;
};

// Batch updates file changes. Note that the order of operations (delete, then
// add, then modified) is critical
export function updateCacheFromFileSystem(
  changes: Changes,
  settings: ParsedSettings,
  operationStart: number
) {
  // This shouldn't be possible and is just to make sure TypeScript is happy
  if (!baseProjectInfo || !resolvedProjectInfo || !analyzedProjectInfo) {
    throw new InternalError('Project info not initialized');
  }

  // We may have a list of added/deleted/modified files from the file system,
  // but there's a chance we've already processed those changes through an
  // editor change. We track whether or not the list actually caused in changes.
  // We use this counter to track these actual changes
  let numDeletes = 0;
  let numAdditions = 0;
  let numModified = 0;

  // First, process any file deletes
  const baseStart = Date.now();
  for (const filePath of changes.deleted) {
    if (baseProjectInfo.files.has(filePath)) {
      numDeletes++;
      deleteResolvedInfoForFile(filePath, baseProjectInfo, resolvedProjectInfo);
      deleteBaseInfoForFile(filePath, baseProjectInfo);
    }
  }
  const baseEnd = Date.now();

  // Next, process any file adds
  const resolveStart = Date.now();
  for (const { filePath } of changes.added) {
    // We might already have this new file in memory if it was created in editor
    // and previously linted while it was only in memory
    if (!baseProjectInfo.files.has(filePath)) {
      numAdditions++;
      addBaseInfoForFile(
        {
          ...parseFile(filePath),
          isEntryPointCheck: getEntryPointCheck(settings.entryPoints),
        },
        baseProjectInfo
      );
    }
  }

  // If we added or deleted any files, we fully recompute resolutions to take
  // these changes into account, since files may have been renamed. Renames are
  // especially tricky since it may just be an extension change(.js->.ts), and
  // we might have already seen the new .ts file in a previous update.
  // TODO: it's probably possible to do a more performant+surgical recomputation
  if (numDeletes || numAdditions) {
    resolvedProjectInfo = computeResolvedInfo(baseProjectInfo);
  }
  const resolveEnd = Date.now();

  // Next, process any modified files
  for (const { filePath, latestUpdatedAt } of changes.modified) {
    const previousFileInfo = baseProjectInfo.files.get(filePath);
    if (
      !previousFileInfo ||
      (previousFileInfo.fileType === 'code' &&
        previousFileInfo.lastUpdatedAt < latestUpdatedAt)
    ) {
      numModified++;
      updateBaseInfoForFile(
        {
          ...parseFile(filePath),
          isEntryPointCheck: getEntryPointCheck(settings.entryPoints),
        },
        baseProjectInfo
      );
      updateResolvedInfoForFile(filePath, baseProjectInfo, resolvedProjectInfo);
    }
  }

  // Finally, recompute analyzed info
  if (numDeletes || numAdditions | numModified) {
    const analyzestart = Date.now();
    analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
    const analyzeEnd = Date.now();

    debug(
      `Synchronized changes from filesystem (deleted=${numDeletes.toLocaleString()} added=${numAdditions.toLocaleString()} modified=${numModified.toLocaleString()}):`
    );
    debug(
      `  total:         ${formatMilliseconds(analyzeEnd - operationStart)}`
    );
    debug(`  base info:     ${formatMilliseconds(baseEnd - baseStart)}`);
    debug(`  resolved info: ${formatMilliseconds(resolveEnd - resolveStart)}`);
    debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - analyzestart)}`);

    return true;
  }
  return false;
}

export function updateCacheForFile(
  filePath: string,
  fileContents: string,
  ast: TSESTree.Program,
  { entryPoints, rootDir }: ParsedSettings
) {
  // This shouldn't be possible and is just to make sure TypeScript is happy
  if (!baseProjectInfo || !resolvedProjectInfo || !analyzedProjectInfo) {
    throw new InternalError('Project info not initialized');
  }

  const baseOptions = {
    filePath,
    fileContents,
    ast,
    isEntryPointCheck: (filePath: string, symbolName: string) =>
      entryPoints.some(
        ({ file, symbol }) => file === filePath && symbol === symbolName
      ),
  };

  // Check if we're updating file info or adding a new file
  if (analyzedProjectInfo.files.has(filePath)) {
    const baseStart = Date.now();
    const shouldUpdateDerivedProjectInfo = updateBaseInfoForFile(
      baseOptions,
      baseProjectInfo
    );
    const baseEnd = Date.now();

    // If we don't need to update
    if (shouldUpdateDerivedProjectInfo) {
      const resolveStart = Date.now();
      updateResolvedInfoForFile(filePath, baseProjectInfo, resolvedProjectInfo);
      const resolveEnd = Date.now();

      const analyzeStart = Date.now();
      analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
      const analyzeEnd = Date.now();

      debug(`Update for ${filePath.replace(rootDir, '')} complete:`);
      debug(`  total:         ${formatMilliseconds(analyzeEnd - baseStart)}`);
      debug(`  base info:     ${formatMilliseconds(baseEnd - baseStart)}`);
      debug(
        `  resolved info: ${formatMilliseconds(resolveEnd - resolveStart)}`
      );
      debug(
        `  analyzed info: ${formatMilliseconds(analyzeEnd - analyzeStart)}`
      );

      return true;
    } else {
      // Even if we don't need to update information we compute, we still need
      // to update the AST nodes to take into account potentially changed locs
      const baseFileInfo = baseProjectInfo.files.get(filePath);
      const resolvedFileInfo = resolvedProjectInfo.files.get(filePath);
      const analyzedFileInfo = analyzedProjectInfo.files.get(filePath);
      if (
        !baseFileInfo ||
        baseFileInfo.fileType !== 'code' ||
        !resolvedFileInfo ||
        resolvedFileInfo.fileType !== 'code' ||
        !analyzedFileInfo ||
        analyzedFileInfo.fileType !== 'code'
      ) {
        throw new InternalError(`Could not get file info for "${filePath}"`);
      }
      for (let i = 0; i < baseFileInfo.exports.length; i++) {
        resolvedFileInfo.exports[i] = {
          ...resolvedFileInfo.exports[i],
          ...baseFileInfo.exports[i],
        };
        analyzedFileInfo.exports[i] = {
          ...analyzedFileInfo.exports[i],
          ...resolvedFileInfo.exports[i],
        };
      }
      for (let i = 0; i < baseFileInfo.reexports.length; i++) {
        resolvedFileInfo.reexports[i] = {
          ...resolvedFileInfo.reexports[i],
          ...baseFileInfo.reexports[i],
        };
        analyzedFileInfo.reexports[i] = {
          ...analyzedFileInfo.reexports[i],
          ...resolvedFileInfo.reexports[i],
          // TODO: figure out why this doesn't work without the cast
        } as AnalyzedReexport;
      }
      for (let i = 0; i < baseFileInfo.imports.length; i++) {
        resolvedFileInfo.imports[i] = {
          ...resolvedFileInfo.imports[i],
          ...baseFileInfo.imports[i],
        };
        analyzedFileInfo.imports[i] = {
          ...analyzedFileInfo.imports[i],
          ...resolvedFileInfo.imports[i],
          // TODO: figure out why this doesn't work without the cast
        } as AnalyzedImport;
      }
      return false;
    }
  } else {
    const baseStart = Date.now();
    addBaseInfoForFile(baseOptions, baseProjectInfo);
    const baseEnd = Date.now();

    const resolveStart = Date.now();
    computeFolderTree(baseProjectInfo);
    addResolvedInfoForFile(filePath, baseProjectInfo, resolvedProjectInfo);
    const resolveEnd = Date.now();

    const anazlyzeStart = Date.now();
    analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
    const analyzeEnd = Date.now();

    debug(`${filePath.replace(rootDir, '')} add complete:`);
    debug(`  total:         ${formatMilliseconds(analyzeEnd - baseStart)}`);
    debug(`  base info:     ${formatMilliseconds(baseEnd - baseStart)}`);
    debug(`  resolved info: ${formatMilliseconds(resolveEnd - resolveStart)}`);
    debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - anazlyzeStart)}`);

    return true;
  }
}
