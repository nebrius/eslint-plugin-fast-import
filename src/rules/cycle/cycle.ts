import type { AnalyzedProjectInfo } from '../../types/analyzed.js';
import { InternalError } from '../../util/error.js';
import {
  createRule,
  getESMInfo,
  getLocFromRange,
  registerUpdateListener,
} from '../util.js';

type Options = [];
type MessageIds = 'noCycles';

// Map of filepaths to imports/reexports with cycle dependencies
const cycleMap = new Map<string, string[]>();
const visitedFiles = new Set<string>();

function checkFile(
  originalFilePath: string,
  currentFilePath: string,
  projectInfo: AnalyzedProjectInfo,
  importStack: string[]
) {
  const fileDetails = projectInfo.files.get(currentFilePath);
  /* istanbul ignore if */
  if (!fileDetails) {
    throw new InternalError(`Could not get file info for "${currentFilePath}"`);
  }

  // Non-JS files by definition can't be circilar, since they can't import JS
  if (fileDetails.fileType !== 'code') {
    return false;
  }

  // Mark this file as visited
  visitedFiles.add(currentFilePath);

  // Now check if this file is part of a cycle
  const firstInstanceIndex = importStack.indexOf(currentFilePath);
  if (firstInstanceIndex !== -1) {
    const filesInCycle = importStack.slice(firstInstanceIndex);
    return filesInCycle.includes(originalFilePath);
  }

  // If this wasn't a cycle, then keep exploring
  for (const importEntry of [
    ...fileDetails.imports,
    ...fileDetails.reexports,
  ]) {
    if (
      ('isTypeImport' in importEntry && importEntry.isTypeImport) ||
      ('isTypeReexport' in importEntry && importEntry.isTypeReexport) ||
      importEntry.moduleType !== 'firstPartyCode' ||
      visitedFiles.has(importEntry.resolvedModulePath)
    ) {
      continue;
    }
    if (
      checkFile(originalFilePath, importEntry.resolvedModulePath, projectInfo, [
        ...importStack,
        currentFilePath,
      ])
    ) {
      return true;
    }
  }

  return false;
}

registerUpdateListener(() => {
  cycleMap.clear();
  visitedFiles.clear();
});

// This is only used in tests, since update listeners aren't guaranteed to
// be called on each run
// eslint-disable-next-line fast-import/no-unused-exports
export function _resetCycleMap() {
  cycleMap.clear();
}

export const noCycle = createRule<Options, MessageIds>({
  name: 'no-cycle',
  meta: {
    docs: {
      description: 'Ensures that there are no cycles in imports/reexports',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noCycles: 'Imports/reexports cannot form a cycle',
    },
  },
  defaultOptions: [],
  create(context) {
    const esmInfo = getESMInfo(context);
    if (!esmInfo) {
      return {};
    }

    const { fileInfo, projectInfo } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // If we recomputed on this run, then we need to recompute cycles
    if (!cycleMap.has(context.filename)) {
      const importedFilesSearched = new Set<string>();
      const cycleNodes: string[] = [];
      for (const importEntry of [...fileInfo.imports, ...fileInfo.reexports]) {
        if (
          !('resolvedModulePath' in importEntry) ||
          !importEntry.resolvedModulePath ||
          importedFilesSearched.has(importEntry.resolvedModulePath)
        ) {
          continue;
        }
        importedFilesSearched.add(importEntry.resolvedModulePath);
        if (
          checkFile(
            context.filename,
            importEntry.resolvedModulePath,
            projectInfo,
            [context.filename]
          )
        ) {
          cycleNodes.push(importEntry.resolvedModulePath);
        }
      }
      cycleMap.set(context.filename, cycleNodes);
    }

    const cycleImports = cycleMap.get(context.filename);
    /* istanbul ignore if */
    if (!cycleImports) {
      throw new InternalError(
        `Cycle list is undefined for ${context.filename}`
      );
    }

    for (const cycleImport of cycleImports) {
      for (const importEntry of [...fileInfo.imports, ...fileInfo.reexports]) {
        if (
          importEntry.moduleType === 'firstPartyCode' &&
          importEntry.resolvedModulePath === cycleImport
        ) {
          context.report({
            messageId: 'noCycles',
            loc: getLocFromRange(context, importEntry.statementNodeRange),
          });
          continue;
        }
      }
    }

    return {};
  },
});
