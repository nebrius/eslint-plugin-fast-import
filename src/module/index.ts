import type { AnalyzedProjectInfo } from '../types/analyzed';
import { computeAnalyzedInfo } from './computeAnalyzedInfo';
import {
  addResolvedInfoForFile,
  computeResolvedInfo,
  updateResolvedInfoForFile,
} from './computeResolvedInfo';
import {
  addBaseInfoForFile,
  computeBaseInfo,
  updateBaseInfoForFile,
} from './computeBaseInfo';
import { InternalError } from '../util/error';
import type { BaseProjectInfo } from '../types/base';
import type { ResolvedProjectInfo } from '../types/resolved';
import type { ParsedSettings } from '../settings/settings';
import { debug, formatMilliseconds } from '../util/logging';
import type { TSESTree } from '@typescript-eslint/utils';

let baseProjectInfo: BaseProjectInfo | null = null;
let resolvedProjectInfo: ResolvedProjectInfo | null = null;
let analyzedProjectInfo: AnalyzedProjectInfo | null = null;
export function initializeProject({
  rootDir,
  alias,
  entryPoints,
}: ParsedSettings) {
  // If we've already analyzed the project, bail
  if (analyzedProjectInfo) {
    return;
  }

  const start = Date.now();
  baseProjectInfo = computeBaseInfo({
    rootDir,
    alias,
    isEntryPointCheck: (filePath, symbolName) =>
      entryPoints.some(
        ({ file, symbol }) => file === filePath && symbol === symbolName
      ),
  });
  const baseEnd = Date.now();
  resolvedProjectInfo = computeResolvedInfo(baseProjectInfo);
  const resolveEnd = Date.now();
  analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
  const analyzeEnd = Date.now();

  debug(`Initial computation complete:`);
  debug(`  base info:     ${formatMilliseconds(baseEnd - start)}`);
  debug(`  resolved info: ${formatMilliseconds(resolveEnd - start)}`);
  debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - start)}`);

  return analyzedProjectInfo;
}

export function getProjectInfo() {
  if (!analyzedProjectInfo) {
    throw new InternalError('Project info requested before initialization');
  }
  return analyzedProjectInfo;
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
    const start = Date.now();
    const shouldUpdateDerivedProjectInfo = updateBaseInfoForFile(
      baseProjectInfo,
      baseOptions
    );
    const baseEnd = Date.now();

    // If we don't need to update
    if (shouldUpdateDerivedProjectInfo) {
      updateResolvedInfoForFile(filePath, baseProjectInfo, resolvedProjectInfo);
      const resolveEnd = Date.now();
      analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
      const analyzeEnd = Date.now();

      debug(`Update for ${filePath.replace(rootDir, '')} complete:`);
      debug(`  base info:     ${formatMilliseconds(baseEnd - start)}`);
      debug(`  resolved info: ${formatMilliseconds(resolveEnd - start)}`);
      debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - start)}`);
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
        resolvedFileInfo.exports[i].reportNode =
          baseFileInfo.exports[i].reportNode;
        analyzedFileInfo.exports[i].reportNode =
          baseFileInfo.exports[i].reportNode;
      }
      for (let i = 0; i < baseFileInfo.reexports.length; i++) {
        resolvedFileInfo.reexports[i].reportNode =
          baseFileInfo.reexports[i].reportNode;
        analyzedFileInfo.reexports[i].reportNode =
          baseFileInfo.reexports[i].reportNode;
      }
      for (let i = 0; i < baseFileInfo.imports.length; i++) {
        resolvedFileInfo.imports[i].reportNode =
          baseFileInfo.imports[i].reportNode;
        analyzedFileInfo.imports[i].reportNode =
          baseFileInfo.imports[i].reportNode;
      }
      debug(
        `Update for ${filePath.replace(rootDir, '')} base only complete in ${formatMilliseconds(baseEnd - start)}`
      );
    }
  } else {
    const start = Date.now();
    addBaseInfoForFile(baseProjectInfo, baseOptions);
    const baseEnd = Date.now();
    addResolvedInfoForFile(filePath, baseProjectInfo, resolvedProjectInfo);
    const resolveEnd = Date.now();
    analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
    const analyzeEnd = Date.now();

    debug(`${filePath.replace(rootDir, '')} add complete:`);
    debug(`  base info:     ${formatMilliseconds(baseEnd - start)}`);
    debug(`  resolved info: ${formatMilliseconds(resolveEnd - start)}`);
    debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - start)}`);
  }
}
