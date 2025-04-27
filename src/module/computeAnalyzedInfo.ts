import type {
  AnalyzedBarrelImport,
  AnalyzedBarrelReexport,
  AnalyzedCodeFileDetails,
  AnalyzedDynamicImport,
  AnalyzedExport,
  AnalyzedProjectInfo,
  AnalyzedSingleImport,
  AnalyzedSingleReexport,
} from '../types/analyzed.js';
import type { ResolvedProjectInfo } from '../types/resolved.js';
import { InternalError } from '../util/error.js';

export function computeAnalyzedInfo(
  resolvedProjectInfo: ResolvedProjectInfo
): AnalyzedProjectInfo {
  const analyzedProjectInfo: AnalyzedProjectInfo = {
    ...resolvedProjectInfo,
    files: new Map(),
  };

  // First we initialize each detail with placeholder data, since we need a
  // completely initialized `analyzedInfo` object available before we can start
  // traversing/populating analyzed info
  for (const [filePath, fileDetails] of resolvedProjectInfo.files) {
    if (fileDetails.fileType !== 'code') {
      analyzedProjectInfo.files.set(filePath, {
        fileType: 'other',
      });
      continue;
    }

    const analyzedFileInfo: AnalyzedCodeFileDetails = {
      fileType: 'code',
      hasEntryPoints: fileDetails.hasEntryPoints,
      lastUpdatedAt: fileDetails.lastUpdatedAt,
      exports: [],
      singleImports: [],
      barrelImports: [],
      dynamicImports: [],
      singleReexports: [],
      barrelReexports: [],
    };
    analyzedProjectInfo.files.set(filePath, analyzedFileInfo);

    for (const exportDetails of fileDetails.exports) {
      analyzedFileInfo.exports.push({
        ...exportDetails,
        importedBy: [],
        barrelImportedBy: [],
      });
    }

    for (const reexportDetails of fileDetails.singleReexports) {
      analyzedFileInfo.singleReexports.push({
        ...reexportDetails,
        // If this reexport is a builtin or thirdparty reexport, we know
        // what the root module type is. However, if it's first party then
        // we don't know what the type is yet. In this case, once we
        // determine the type we'll change this value and potentially fill
        // in other details
        rootModuleType:
          reexportDetails.resolvedModuleType === 'builtin' ||
          reexportDetails.resolvedModuleType === 'thirdParty'
            ? reexportDetails.resolvedModuleType
            : undefined,
        importedBy: [],
        barrelImportedBy: [],
      });
    }

    for (const reexportDetails of fileDetails.barrelReexports) {
      analyzedFileInfo.barrelReexports.push({
        ...reexportDetails,
        importedBy: [],
        barrelImportedBy: [],
      });
    }

    for (const importDetails of fileDetails.singleImports) {
      analyzedFileInfo.singleImports.push({
        ...importDetails,
        // We don't know what the type is yet, but once we determine the
        // type we'll change this value and potentially fill in other
        // details
        rootModuleType: undefined,
      });
    }

    for (const importDetails of fileDetails.barrelImports) {
      analyzedFileInfo.barrelImports.push({
        ...importDetails,
      });
    }

    for (const importDetails of fileDetails.dynamicImports) {
      analyzedFileInfo.dynamicImports.push({
        ...importDetails,
      });
    }
  }

  // Now that we have placeholder values for each entry, we're ready to
  // analyze/traverse the tree
  for (const [filePath, fileDetails] of analyzedProjectInfo.files) {
    // Nothing to do if this isn't a code file
    if (fileDetails.fileType !== 'code') {
      continue;
    }

    // First, analyze all imports
    for (const importDetails of fileDetails.singleImports) {
      analyzeSingleImport({
        originAnalyzedImport: {
          type: 'single',
          filePath,
          importEntry: importDetails,
        },
        analyzedProjectInfo,
      });
    }
    for (const importDetails of [
      ...fileDetails.barrelImports,
      ...fileDetails.dynamicImports,
    ]) {
      analyzeBarrelImport({
        originAnalyzedImport: {
          type: 'barrel',
          filePath,
          importEntry: importDetails,
        },
        pivotAnalyzedImport: importDetails,
        analyzedProjectInfo,
      });
    }

    // Now, treat reexports that are also entry points as an import, so that we
    // can mark the relevant exports they point to as being imported too (since
    // in reality they are)
    for (const reexportDetails of fileDetails.singleReexports) {
      if (!reexportDetails.isEntryPoint) {
        continue;
      }
      analyzeSingleImport({
        originAnalyzedImport: {
          type: 'single',
          filePath,
          importEntry: reexportDetails,
        },
        analyzedProjectInfo,
      });
    }
    for (const reexportDetails of fileDetails.barrelReexports) {
      if (!reexportDetails.isEntryPoint) {
        continue;
      }
      analyzeBarrelImport({
        originAnalyzedImport: {
          type: 'barrel',
          filePath,
          importEntry: reexportDetails,
        },
        pivotAnalyzedImport: reexportDetails,
        analyzedProjectInfo,
      });
    }
  }

  return analyzedProjectInfo;
}

function linkImportToExport(
  importFilePath: string,
  importEntry: AnalyzedSingleImport | AnalyzedSingleReexport,
  exportFilePath: string,
  exportEntry: AnalyzedExport | AnalyzedBarrelReexport
) {
  /* istanbul ignore if */
  if (importEntry.resolvedModuleType !== 'firstPartyCode') {
    throw new InternalError(
      `Attempted to link export that is first party to import not marked as first party`
    );
  }

  /* istanbul ignore if */
  if (importEntry.type === 'singleReexport' && !importEntry.isEntryPoint) {
    throw new InternalError(
      `Attempted to link reexport that is not an entry point`
    );
  }

  // Update the export to include the import that imports it
  exportEntry.importedBy.push({
    filePath: importFilePath,
    importEntry,
  });

  // Update the import to include the export it points to
  Object.assign(importEntry, {
    rootModuleType: 'firstPartyCode',
    rootModulePath: exportFilePath,
    rootExportEntry: exportEntry,
  } satisfies Partial<AnalyzedSingleImport | AnalyzedSingleReexport>);
}

type AnalyzeSingleImportProps = {
  originAnalyzedImport: {
    type: 'single';
    filePath: string;
    importEntry: AnalyzedSingleImport | AnalyzedSingleReexport;
  };
  analyzedProjectInfo: AnalyzedProjectInfo;
};

function analyzeSingleImport({
  originAnalyzedImport,
  analyzedProjectInfo,
}: AnalyzeSingleImportProps) {
  if (
    originAnalyzedImport.importEntry.resolvedModuleType !== 'firstPartyCode'
  ) {
    return;
  }

  // Return value indicates if we've found the root export yet or not
  function traverse(currentFile: string, currentImportName: string): boolean {
    // Get the file from the project info
    const targetFileDetails = analyzedProjectInfo.files.get(currentFile);

    /* istanbul ignore if */
    if (!targetFileDetails) {
      throw new InternalError(
        `File ${currentFile} is missing in project info`,
        {
          filePath: originAnalyzedImport.filePath,
          range: originAnalyzedImport.importEntry.statementNodeRange,
        }
      );
    }

    // Shouldn't happen in practice, but check anyways to make TypeScript happy,
    // plus "shouldn't happen" has a funny way of coming true sometimes
    /* istanbul ignore if */
    if (targetFileDetails.fileType !== 'code') {
      throw new InternalError(
        `moduleType on consumer of ${currentFile} is "code", but file type is "${targetFileDetails.fileType}"`,
        {
          filePath: originAnalyzedImport.filePath,
          range: originAnalyzedImport.importEntry.statementNodeRange,
        }
      );
    }

    // First, check if we've found the root export
    const exportEntry = targetFileDetails.exports.find(
      (e) => currentImportName === e.exportName
    );
    if (exportEntry?.exportName === currentImportName) {
      linkImportToExport(
        originAnalyzedImport.filePath,
        originAnalyzedImport.importEntry,
        currentFile,
        exportEntry
      );
      return true;
    }

    // Next, check if there is a single re-export that matches
    const singleReexportEntry = targetFileDetails.singleReexports.find(
      (r) => r.exportName === currentImportName
    );
    if (singleReexportEntry) {
      switch (singleReexportEntry.resolvedModuleType) {
        case 'builtin':
        case 'thirdParty': {
          originAnalyzedImport.importEntry.rootModuleType =
            singleReexportEntry.resolvedModuleType;
          return true;
        }
        case 'firstPartyOther': {
          Object.assign(singleReexportEntry, {
            rootModuleType: 'firstPartyOther',
            rootModulePath: currentFile,
          } satisfies Partial<AnalyzedSingleReexport>);
          return true;
        }
        case 'firstPartyCode': {
          if (
            traverse(
              singleReexportEntry.resolvedModulePath,
              singleReexportEntry.importName
            )
          ) {
            return true;
          }
          break;
        }
      }
    }

    // Now check if there's a named barrel export that matches the name of the
    // import we're looking for. In such a case, it markes the end of discovery,
    // since the named import points to multiple sources
    const barrelReexportEntry = targetFileDetails.barrelReexports.find(
      (r) => r.exportName === currentImportName
    );
    if (barrelReexportEntry) {
      if (barrelReexportEntry.resolvedModuleType === 'firstPartyCode') {
        linkImportToExport(
          originAnalyzedImport.filePath,
          originAnalyzedImport.importEntry,
          currentFile,
          barrelReexportEntry
        );

        // Even though we found what the import points to, we need to traverse
        // the barrel re-export to ensure we mark all exports bundled together
        // are marked as being imported by this import
        analyzeBarrelImport({
          originAnalyzedImport,
          pivotAnalyzedImport: barrelReexportEntry,
          analyzedProjectInfo,
        });

        // Regardless of what happened when further traversing the barrel
        // re-export, we know we found what the import points too.
        return true;
      } else {
        // Otherwise, we're doing a barrel reexport of, say, a CSS module.
        // I'm pretty certain that this syntax is the same as doing a non-barrel
        // reexport, since these files can only have a single default export
        // (think the difference between `* as React` vs `React`). Nonetheless,
        // we can still analyze it.
        if (barrelReexportEntry.resolvedModuleType === 'firstPartyOther') {
          // If we couldn't resolve the file, then we might as well keep looking
          // for this export elsewhere, even though it likely indicates a
          // pathing bug on the user's part.
          if (!barrelReexportEntry.resolvedModulePath) {
            return false;
          }
          Object.assign(originAnalyzedImport.importEntry, {
            rootModuleType: 'firstPartyOther',
            rootModulePath: barrelReexportEntry.resolvedModulePath,
          } satisfies Partial<AnalyzedSingleImport | AnalyzedSingleReexport>);
          return true;
        }

        // This means we're import third party non-code items, such as CSS
        // styles from something like Tailwind
        Object.assign(originAnalyzedImport.importEntry, {
          rootModuleType: barrelReexportEntry.resolvedModuleType,
        } satisfies Partial<AnalyzedSingleImport | AnalyzedSingleReexport>);
        return true;
      }
    }

    // Finally, check and traverse all barrel re-exports. Since we don't know
    // what barrel exports contain, we have to traverse all of them in a
    // depth-first search
    for (const reexportEntry of targetFileDetails.barrelReexports) {
      // Technically speaking, it's possible for the root export to exist here
      // if, say, someone did something stupid like `import { join } from
      // './foo'` coupled with `export * from 'node:path'`. That's really bad
      // coding though so we're not going to support it here
      if (reexportEntry.resolvedModuleType !== 'firstPartyCode') {
        continue;
      }

      if (traverse(reexportEntry.resolvedModulePath, currentImportName)) {
        // If we found the root export, bail early
        return true;
      }
    }

    // Finally, if we got here, we couldn't resolve the root export
    return false;
  }

  traverse(
    originAnalyzedImport.importEntry.resolvedModulePath,
    originAnalyzedImport.importEntry.importName
  );
}

type AnalyzeBarrelImportProps = {
  originAnalyzedImport:
    | {
        type: 'single';
        filePath: string;
        importEntry: AnalyzedSingleImport | AnalyzedSingleReexport;
      }
    | {
        type: 'barrel';
        filePath: string;
        importEntry:
          | AnalyzedBarrelImport
          | AnalyzedDynamicImport
          | AnalyzedBarrelReexport;
      };
  pivotAnalyzedImport:
    | AnalyzedBarrelImport
    | AnalyzedDynamicImport
    | AnalyzedBarrelReexport;
  analyzedProjectInfo: AnalyzedProjectInfo;
};

function analyzeBarrelImport({
  originAnalyzedImport,
  pivotAnalyzedImport,
  analyzedProjectInfo,
}: AnalyzeBarrelImportProps) {
  if (
    originAnalyzedImport.importEntry.resolvedModuleType !== 'firstPartyCode'
  ) {
    return;
  }

  function traverse(currentFile: string) {
    // Get the file from the project info
    const targetFileDetails = analyzedProjectInfo.files.get(currentFile);

    /* istanbul ignore if */
    if (!targetFileDetails) {
      throw new InternalError(
        `File ${currentFile} is missing in project info`,
        {
          filePath: originAnalyzedImport.filePath,
          range: originAnalyzedImport.importEntry.statementNodeRange,
        }
      );
    }

    // Shouldn't happen in practice, but check anyways to make TypeScript happy,
    // plus "shouldn't happen" has a funny way of coming true sometimes
    /* istanbul ignore if */
    if (targetFileDetails.fileType !== 'code') {
      throw new InternalError(
        `moduleType on consumer of ${currentFile} is "code", but file type is "${targetFileDetails.fileType}"`,
        {
          filePath: originAnalyzedImport.filePath,
          range: originAnalyzedImport.importEntry.statementNodeRange,
        }
      );
    }

    // First, mark each export as being barrel imported
    for (const exportEntry of targetFileDetails.exports) {
      exportEntry.barrelImportedBy.push({
        filePath: originAnalyzedImport.filePath,
        importEntry: originAnalyzedImport.importEntry,
      });
    }

    // Now go through reexports and traverse further
    for (const reexportEntry of [
      ...targetFileDetails.singleReexports,
      ...targetFileDetails.barrelReexports,
    ]) {
      // Nothing to do in non-first party code
      if (reexportEntry.resolvedModuleType !== 'firstPartyCode') {
        continue;
      }
      traverse(reexportEntry.resolvedModulePath);
    }
  }

  /* istanbul ignore if */
  if (pivotAnalyzedImport.resolvedModuleType !== 'firstPartyCode') {
    throw new InternalError(
      `Attempted to traverse barrel import that is not first party code`,
      {
        filePath: originAnalyzedImport.filePath,
        range: originAnalyzedImport.importEntry.statementNodeRange,
      }
    );
  }
  traverse(pivotAnalyzedImport.resolvedModulePath);
}
