import type {
  AnalyzedBarrelImport,
  AnalyzedBarrelReexport,
  AnalyzedCodeFileDetails,
  AnalyzedDynamicImport,
  AnalyzedImportBase,
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
        importedByFiles: [],
        barrelImportedByFiles: [],
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
        importedByFiles: [],
        barrelImportedByFiles: [],
      });
    }

    for (const reexportDetails of fileDetails.barrelReexports) {
      analyzedFileInfo.barrelReexports.push({
        ...reexportDetails,
        importedByFiles: [],
        barrelImportedByFiles: [],
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
      analyzeSingleImport(
        filePath,
        importDetails,
        analyzedProjectInfo,
        'single'
      );
    }
    for (const importDetails of [
      ...fileDetails.barrelImports,
      ...fileDetails.dynamicImports,
    ]) {
      analyzeBarrelImport(
        filePath,
        importDetails,
        analyzedProjectInfo,
        'barrel'
      );
    }

    // Now, treat reexports that are also entry points as an import, so that we
    // can mark the relevant exports they point to as being imported too (since
    // in reality they are)
    for (const reexportDetails of fileDetails.singleReexports) {
      if (!reexportDetails.isEntryPoint) {
        continue;
      }
      analyzeSingleImport(
        filePath,
        reexportDetails,
        analyzedProjectInfo,
        'single'
      );
    }
    for (const reexportDetails of fileDetails.barrelReexports) {
      if (!reexportDetails.isEntryPoint) {
        continue;
      }
      analyzeBarrelImport(
        filePath,
        reexportDetails,
        analyzedProjectInfo,
        'barrel'
      );
    }
  }

  return analyzedProjectInfo;
}

type InitialImportType = 'single' | 'barrel';

function analyzeSingleImport(
  originFilePath: string,
  originAnalyzedImport: AnalyzedSingleImport | AnalyzedSingleReexport,
  analyzedProjectInfo: AnalyzedProjectInfo,
  initialImportType: InitialImportType
) {
  if (originAnalyzedImport.resolvedModuleType !== 'firstPartyCode') {
    return;
  }

  // Return value indicates if we've found the root export yet or not
  function traverse(
    currentFile: string,
    currentImportName: string
  ): AnalyzedImportBase | undefined {
    // Get the file from the project info
    const targetFileDetails = analyzedProjectInfo.files.get(currentFile);

    /* istanbul ignore if */
    if (!targetFileDetails) {
      throw new InternalError(
        `File ${currentFile} is missing in project info`,
        {
          filePath: originFilePath,
          range: originAnalyzedImport.statementNodeRange,
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
          filePath: originFilePath,
          range: originAnalyzedImport.statementNodeRange,
        }
      );
    }

    // First, check if we've found the root export
    const exportEntry = targetFileDetails.exports.find(
      (e) => currentImportName === e.exportName
    );
    if (exportEntry?.exportName === currentImportName) {
      // Set the consumers of the export
      exportEntry.importedByFiles.push(originFilePath);

      // Set the root info
      const rootModuleInfo: AnalyzedImportBase = {
        rootModuleType: 'firstPartyCode',
        rootModulePath: currentFile,
        rootExportName: exportEntry.exportName,
        rootExportType: 'export',
      };
      return rootModuleInfo;
    }

    // Next, check if there is a single re-export that matches
    const singleReexportEntry = targetFileDetails.singleReexports.find(
      (r) => r.exportName === currentImportName
    );
    if (singleReexportEntry) {
      switch (singleReexportEntry.resolvedModuleType) {
        case 'builtin':
        case 'thirdParty': {
          return {
            rootModuleType: singleReexportEntry.resolvedModuleType,
          };
        }
        case 'firstPartyOther': {
          const rootModuleInfo: AnalyzedImportBase = {
            rootModuleType: 'firstPartyOther',
            rootModulePath: currentFile,
          };
          Object.assign(singleReexportEntry, rootModuleInfo);
          return rootModuleInfo;
        }
        case 'firstPartyCode': {
          singleReexportEntry.importedByFiles.push(originFilePath);
          const rootModuleInfo = traverse(
            singleReexportEntry.resolvedModulePath,
            singleReexportEntry.importName
          );
          if (rootModuleInfo) {
            Object.assign(singleReexportEntry, rootModuleInfo);
          }
          return rootModuleInfo;
        }
      }
    }

    // Now check if there's a named barrel export that matches
    const barrelReexportEntry = targetFileDetails.barrelReexports.find(
      (r) => r.exportName === currentImportName
    );
    if (barrelReexportEntry) {
      if (barrelReexportEntry.resolvedModuleType === 'firstPartyCode') {
        if (initialImportType === 'single' && barrelReexportEntry.exportName) {
          return {
            rootModuleType: 'firstPartyCode',
            rootModulePath: currentFile,
            rootExportName: barrelReexportEntry.exportName,
            rootExportType: 'namedBarrelReexport',
          };
        }

        analyzeBarrelImport(
          originFilePath,
          barrelReexportEntry,
          analyzedProjectInfo,
          initialImportType
        );
      } else {
        if (initialImportType === 'single') {
          if (barrelReexportEntry.resolvedModuleType === 'firstPartyOther') {
            if (!barrelReexportEntry.resolvedModulePath) {
              return undefined;
            }
            return {
              rootModuleType: 'firstPartyOther',
              rootModulePath: barrelReexportEntry.resolvedModulePath,
            };
          }
          return {
            rootModuleType: barrelReexportEntry.resolvedModuleType,
          };
        }
        // This is an edge case that we just can't handle, so we pretend we
        // didn't find it. This happens when we have:
        //
        // // foo.ts
        // import { join } from './bar';
        //
        // // bar.ts
        // export * from 'node:path';
        // export * from 'node:url';
        //
        // Since we don't know the names of what's exported from third
        // party/builtin modules, we can't actually know which module `join`
        // came from
        return undefined;
      }
    }

    // Finally, check and traverse all barrel re-exports. Since we don't know
    // what barrel exports contain yet, we have
    // to traverse all of them in a depth-first search
    for (const reexportEntry of targetFileDetails.barrelReexports) {
      // Technically speaking, it's possible for the root export to exist here
      // if, say, someone did something stupid like `import { join } from
      // './foo'` coupled with `export * from 'node:path'`. That's really bad
      // coding though so we're not going to support it here
      if (reexportEntry.resolvedModuleType !== 'firstPartyCode') {
        continue;
      }

      // If we found the root export, bail early
      const rootModuleInfo = traverse(
        reexportEntry.resolvedModulePath,
        currentImportName
      );
      if (rootModuleInfo) {
        reexportEntry.importedByFiles.push(originFilePath);
        return rootModuleInfo;
      }
    }

    // Finally, if we got here, we couldn't resolve the root export
    return undefined;
  }

  const rootModuleInfo = traverse(
    originAnalyzedImport.resolvedModulePath,
    originAnalyzedImport.importName
  );
  if (rootModuleInfo) {
    Object.assign(originAnalyzedImport, rootModuleInfo);
  }
}

function analyzeBarrelImport(
  originFilePath: string,
  originAnalyzedImport:
    | AnalyzedBarrelImport
    | AnalyzedBarrelReexport
    | AnalyzedDynamicImport,
  analyzedProjectInfo: AnalyzedProjectInfo,
  initialImportType: InitialImportType
) {
  if (originAnalyzedImport.resolvedModuleType !== 'firstPartyCode') {
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
          filePath: originFilePath,
          range: originAnalyzedImport.statementNodeRange,
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
          filePath: originFilePath,
          range: originAnalyzedImport.statementNodeRange,
        }
      );
    }

    // First, mark each export as being barrel imported
    for (const exportEntry of targetFileDetails.exports) {
      exportEntry.barrelImportedByFiles.push(originFilePath);
    }

    // Now go through reexports and traverse single reexports further
    for (const reexportEntry of targetFileDetails.singleReexports) {
      // Nothing to do in non-first party code
      if (reexportEntry.resolvedModuleType !== 'firstPartyCode') {
        continue;
      }
      reexportEntry.barrelImportedByFiles.push(originFilePath);
      analyzeSingleImport(
        originFilePath,
        reexportEntry,
        analyzedProjectInfo,
        initialImportType
      );
    }

    // And go through reexports and traverse barrel reexports further
    for (const reexportEntry of targetFileDetails.barrelReexports) {
      // Nothing to do in non-first party code
      if (reexportEntry.resolvedModuleType !== 'firstPartyCode') {
        continue;
      }
      reexportEntry.barrelImportedByFiles.push(originFilePath);
      traverse(reexportEntry.resolvedModulePath);
    }
  }

  traverse(originAnalyzedImport.resolvedModulePath);
}
