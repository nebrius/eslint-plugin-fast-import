import { createRule, getESMInfo, registerUpdateListener } from '../util';
import type { AnalyzedProjectInfo } from '../../types/analyzed';
import { InternalError } from '../../util/error';

type Options = [];
type MessageIds = 'noCircularImports';

function checkFile(
  originalFilePath: string,
  currentFilePath: string,
  projectInfo: AnalyzedProjectInfo,
  importStack: string[],
  visitedFiles: string[]
) {
  const fileDetails = projectInfo.files.get(currentFilePath);
  if (!fileDetails) {
    throw new InternalError(`Could not get file info for "${currentFilePath}"`);
  }

  // Non-JS files by definition can't be circilar, since they can't import JS
  if (fileDetails.fileType !== 'code') {
    return false;
  }

  // Mark this file as visited
  visitedFiles.push(currentFilePath);

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
      visitedFiles.includes(importEntry.resolvedModulePath)
    ) {
      continue;
    }
    if (
      checkFile(
        originalFilePath,
        importEntry.resolvedModulePath,
        projectInfo,
        [...importStack, currentFilePath],
        visitedFiles
      )
    ) {
      return true;
    }
  }

  return false;
}

// Map of filepaths to imports/reexports with circular dependencies
const circularImportMap = new Map<string, string[]>();

registerUpdateListener(() => {
  circularImportMap.clear();
});

// This is only used in tests, since update listeners aren't guaranteed to
// be called on each run
// eslint-disable-next-line fast-esm/no-unused-exports
export function _resetCircularMap() {
  circularImportMap.clear();
}

export const noCircularImports = createRule<Options, MessageIds>({
  name: 'no-circular-imports',
  meta: {
    docs: {
      description: 'Ensures that there are no circular imports',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noCircularImports: 'Imports cannot be circular',
    },
  },
  defaultOptions: [],
  create(context) {
    const esmInfo = getESMInfo(context);

    // No project info means this file wasn't found as part of the project, e.g.
    // because it's ignored
    if (!esmInfo) {
      return {};
    }

    const { fileInfo, projectInfo } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // If we recomputed on this run, then we need to recompute cycles
    if (!circularImportMap.has(context.filename)) {
      const importedFilesSearched = new Set<string>();
      const circularImportNodes: string[] = [];
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
            [context.filename],
            []
          )
        ) {
          circularImportNodes.push(importEntry.resolvedModulePath);
        }
      }
      circularImportMap.set(context.filename, circularImportNodes);
    }

    const circularImports = circularImportMap.get(context.filename);
    if (!circularImports) {
      throw new InternalError(
        `Circular imports are undefined for ${context.filename}`
      );
    }

    for (const circularImport of circularImports) {
      for (const importEntry of [...fileInfo.imports, ...fileInfo.reexports]) {
        if (
          importEntry.moduleType === 'firstPartyCode' &&
          importEntry.resolvedModulePath === circularImport
        ) {
          context.report({
            messageId: 'noCircularImports',
            node: importEntry.statementNode,
          });
          continue;
        }
      }
    }

    return {};
  },
});
