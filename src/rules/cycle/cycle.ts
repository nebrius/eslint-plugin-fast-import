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

// TODO
// Map of rootDirs to filepaths to imports/reexports with cycle dependencies
const cycleMaps = new Map<string, Map<string, Set<string>>>();

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
    return;
  }

  let cycleMap = cycleMaps.get(projectInfo.rootDir);
  if (!cycleMap) {
    cycleMap = new Map<string, Set<string>>();
    cycleMaps.set(projectInfo.rootDir, cycleMap);
  }

  // Now check if this file is part of a cycle
  const firstInstanceIndex = importStack.indexOf(currentFilePath);
  if (firstInstanceIndex !== -1) {
    const filesInCycle = importStack.slice(firstInstanceIndex);
    for (let i = 0; i < filesInCycle.length; i++) {
      const currentFile = filesInCycle[i];
      const nextFile =
        i === filesInCycle.length - 1 ? filesInCycle[0] : filesInCycle[i + 1];

      const currentCycleMapEntry = cycleMap.get(currentFile);
      if (!currentCycleMapEntry) {
        throw new InternalError(
          `Cycle map entry is undefined for ${currentFile}`
        );
      }
      currentCycleMapEntry.add(nextFile);
    }

    // Stop traversing since we'd otherwise traverse forever
    return;
  }

  // Otherwise, check if we've already analyzed this file
  if (cycleMap.has(currentFilePath)) {
    return;
  }

  // Initialize this file
  cycleMap.set(currentFilePath, new Set());

  // If this wasn't a cycle, then keep exploring
  for (const importEntry of [
    ...fileDetails.singleImports,
    ...fileDetails.singleReexports,
    ...fileDetails.barrelImports,
    ...fileDetails.singleReexports,
    ...fileDetails.barrelReexports,
  ]) {
    if (
      // We allow type imports to be cyclicle since they are compiled out
      ('isTypeImport' in importEntry && importEntry.isTypeImport) ||
      ('isTypeReexport' in importEntry && importEntry.isTypeReexport) ||
      importEntry.resolvedModuleType !== 'firstPartyCode'
    ) {
      continue;
    }
    checkFile(originalFilePath, importEntry.resolvedModulePath, projectInfo, [
      ...importStack,
      currentFilePath,
    ]);
  }

  return;
}

registerUpdateListener((root) => {
  cycleMaps.delete(root);
});

// This is only used in tests, since update listeners aren't guaranteed to
// be called on each run
// eslint-disable-next-line fast-import/no-unused-exports
export function _resetCycleMap() {
  cycleMaps.clear();
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

    // No project info means this file wasn't found as part of the project, e.g.
    // because it's ignored
    /* istanbul ignore if */
    if (!esmInfo) {
      return {};
    }

    const { fileInfo, projectInfo } = esmInfo;
    /* istanbul ignore if */
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    let cycleMap = cycleMaps.get(projectInfo.rootDir);
    if (!cycleMap) {
      cycleMap = new Map<string, Set<string>>();
      cycleMaps.set(projectInfo.rootDir, cycleMap);
    }
    let cycleImports = cycleMap.get(context.filename);
    if (!cycleImports) {
      checkFile(context.filename, context.filename, projectInfo, []);
      cycleImports = cycleMap.get(context.filename);
    }

    /* istanbul ignore if */
    if (!cycleImports) {
      throw new InternalError(
        `Cycle list is undefined for ${context.filename}`
      );
    }

    // Dedupe imports, since we mark cycle imports on a per-file basis, not on a
    // per-import basis
    const visitedImports = new Set<string>();
    for (const cycleImport of cycleImports) {
      for (const importEntry of [
        ...fileInfo.singleImports,
        ...fileInfo.singleReexports,
        ...fileInfo.barrelImports,
        ...fileInfo.singleReexports,
        ...fileInfo.barrelReexports,
      ]) {
        if (
          importEntry.resolvedModuleType === 'firstPartyCode' &&
          importEntry.resolvedModulePath === cycleImport &&
          !visitedImports.has(importEntry.resolvedModulePath)
        ) {
          visitedImports.add(importEntry.resolvedModulePath);
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
