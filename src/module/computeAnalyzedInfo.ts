import { InternalError } from '../util/error';
import type {
  AnalyzedBarrelImport,
  AnalyzedBarrelReexport,
  AnalyzedCodeFileDetails,
  AnalyzedDynamicImport,
  AnalyzedImportBase,
  AnalyzedProjectInfo,
  AnalyzedSingleImport,
  AnalyzedSingleReexport,
} from '../types/analyzed';
import type { ResolvedProjectInfo } from '../types/resolved';

export function computeAnalyzedInfo(
  resolvedProjectInfo: ResolvedProjectInfo
): AnalyzedProjectInfo {
  const analyzedProjectInfo: AnalyzedProjectInfo = {
    ...resolvedProjectInfo,
    files: new Map(),
  };

  // First we initialize each detail with placeholder data, since we need a completely initialized `analyzedInfo` object
  // available before we can start traversing/populating analyzed info
  for (const [filePath, fileDetails] of resolvedProjectInfo.files) {
    if (fileDetails.fileType !== 'code') {
      analyzedProjectInfo.files.set(filePath, {
        fileType: 'other',
      });
      continue;
    }

    const analyzedFileInfo: AnalyzedCodeFileDetails = {
      fileType: 'code',
      imports: [],
      exports: [],
      reexports: [],
    };
    analyzedProjectInfo.files.set(filePath, analyzedFileInfo);

    for (const exportDetails of fileDetails.exports) {
      analyzedFileInfo.exports.push({
        ...exportDetails,
        importedByFiles: [],
        barrelImportedByFiles: [],
        reexportedByFiles: [],
      });
    }

    for (const reexportDetails of fileDetails.reexports) {
      switch (reexportDetails.reexportType) {
        case 'single': {
          analyzedFileInfo.reexports.push({
            ...reexportDetails,
            // If this reexport is a builtin or thirdparty reexport, we know what the root module type is. However, if
            // it's first party then we don't know what the type is yet. In this case, once we determine the type we'll
            // change this value and potentially fill in other details
            rootModuleType:
              reexportDetails.moduleType === 'builtin' ||
              reexportDetails.moduleType === 'thirdParty'
                ? reexportDetails.moduleType
                : undefined,
            importedByFiles: [],
            barrelImportedByFiles: [],
          });
          break;
        }
        case 'barrel': {
          analyzedFileInfo.reexports.push({
            ...reexportDetails,
            importedByFiles: [],
            barrelImportedByFiles: [],
          });
          break;
        }
      }
    }

    for (const importDetails of fileDetails.imports) {
      switch (importDetails.importType) {
        case 'single': {
          analyzedFileInfo.imports.push({
            ...importDetails,
            // We don't know what the type is yet, but once we determine the type we'll change this value and
            // potentially fill in other details
            rootModuleType: undefined,
          });
          break;
        }
        case 'barrel':
        case 'dynamic': {
          analyzedFileInfo.imports.push({
            ...importDetails,
          });
          break;
        }
      }
    }
  }

  // Now that we have placeholder values for each entry, we're ready to analyze/traverse the tree
  for (const [filePath, fileDetails] of analyzedProjectInfo.files) {
    // Nothing to do if this isn't a code file
    if (fileDetails.fileType !== 'code') {
      continue;
    }
    for (const importDetails of fileDetails.imports) {
      if (importDetails.importType === 'single') {
        analyzeSingleImport(
          filePath,
          importDetails,
          analyzedProjectInfo,
          'single',
          []
        );
      } else {
        analyzeBarrelImport(
          filePath,
          importDetails,
          analyzedProjectInfo,
          'barrel',
          []
        );
      }
    }

    // Now, treat reexports that are also entry points as an import, so that we can mark the relevant exports they point
    // to as being imported too (since in reality they are)
    for (const reexportDetails of fileDetails.reexports) {
      if (!reexportDetails.isEntryPoint) {
        continue;
      }
      if (reexportDetails.reexportType === 'single') {
        analyzeSingleImport(
          filePath,
          reexportDetails,
          analyzedProjectInfo,
          'single',
          []
        );
      } else {
        analyzeBarrelImport(
          filePath,
          reexportDetails,
          analyzedProjectInfo,
          'barrel',
          []
        );
      }
    }
  }

  return analyzedProjectInfo;
}

type InitialImportType = 'single' | 'barrel';

function analyzeSingleImport(
  originFilePath: string,
  originAnalyzedImport: AnalyzedSingleImport | AnalyzedSingleReexport,
  analyzedProjectInfo: AnalyzedProjectInfo,
  initialImportType: InitialImportType,

  // Represents files with reexports found between the origin import and root export
  reexportFiles: string[]
) {
  if (originAnalyzedImport.moduleType !== 'firstPartyCode') {
    return;
  }

  // Return value indicates if we've found the root export yet or not
  function traverse(
    currentFile: string,
    currentImportName: string
  ): AnalyzedImportBase | undefined {
    // Get the file from the project info
    const targetFileDetails = analyzedProjectInfo.files.get(currentFile);

    if (!targetFileDetails) {
      throw new InternalError(
        `File ${currentFile} is missing in project info`,
        {
          filePath: originFilePath,
          node: originAnalyzedImport.statementNode,
        }
      );
    }

    // Shouldn't happen in practice, but check anyways to make TypeScript happy, plus "shouldn't happen" has a funny way
    // of coming true sometimes
    if (targetFileDetails.fileType !== 'code') {
      throw new InternalError(
        `moduleType on consumer of ${currentFile} is "code", but file type is "${targetFileDetails.fileType}"`,
        {
          filePath: originFilePath,
          node: originAnalyzedImport.statementNode,
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
      exportEntry.reexportedByFiles.push(...reexportFiles);

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
    const singleReexportEntry = targetFileDetails.reexports.find(
      (r) => r.reexportType === 'single' && r.exportName === currentImportName
    ) as AnalyzedSingleReexport | undefined;
    if (singleReexportEntry) {
      switch (singleReexportEntry.moduleType) {
        case 'builtin':
        case 'thirdParty': {
          return {
            rootModuleType: singleReexportEntry.moduleType,
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
          if (!reexportFiles.includes(currentFile)) {
            reexportFiles.push(currentFile);
          }
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
    const barrelReexportEntry = targetFileDetails.reexports.find(
      (r) => r.reexportType === 'barrel' && r.exportName === currentImportName
    ) as AnalyzedBarrelReexport | undefined;
    if (barrelReexportEntry) {
      if (barrelReexportEntry.moduleType === 'firstPartyCode') {
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
          initialImportType,
          reexportFiles
        );
      } else {
        if (initialImportType === 'single') {
          if (barrelReexportEntry.moduleType === 'firstPartyOther') {
            if (!barrelReexportEntry.resolvedModulePath) {
              return undefined;
            }
            return {
              rootModuleType: 'firstPartyOther',
              rootModulePath: barrelReexportEntry.resolvedModulePath,
            };
          }
          return {
            rootModuleType: barrelReexportEntry.moduleType,
          };
        }
        // This is an edge case that we just can't handle, so we pretend we didn't find it. This happens when we have:
        //
        // // foo.ts
        // import { join } from './bar';
        //
        // // bar.ts
        // export * from 'node:path';
        // export * from 'node:url';
        //
        // Since we don't know the names of what's exported from third party/builtin modules, we can't actually know
        // which module `join` came from
        return undefined;
      }
    }

    // Finally, check and traverse all barrel re-exports. Since we don't know what barrel exports contain yet, we have
    // to traverse all of them in a depth-first search
    for (const reexportEntry of targetFileDetails.reexports) {
      // Technically speaking, it's possible for the root export to exist here if, say, someone did something stupid
      // like `import { join } from './foo'` coupled with `export * from 'node:path'`. That's really bad coding though
      // so we're not going to support it here
      if (
        reexportEntry.moduleType !== 'firstPartyCode' ||
        reexportEntry.reexportType !== 'barrel'
      ) {
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
  initialImportType: InitialImportType,

  // Represents files with reexports found between the origin import and root export
  reexportFiles: string[]
) {
  if (originAnalyzedImport.moduleType !== 'firstPartyCode') {
    return;
  }

  function traverse(currentFile: string) {
    // Get the file from the project info
    const targetFileDetails = analyzedProjectInfo.files.get(currentFile);

    if (!targetFileDetails) {
      throw new InternalError(
        `File ${currentFile} is missing in project info`,
        {
          filePath: originFilePath,
          node: originAnalyzedImport.statementNode,
        }
      );
    }

    // Shouldn't happen in practice, but check anyways to make TypeScript happy, plus "shouldn't happen" has a funny way
    // of coming true sometimes
    if (targetFileDetails.fileType !== 'code') {
      throw new InternalError(
        `moduleType on consumer of ${currentFile} is "code", but file type is "${targetFileDetails.fileType}"`,
        {
          filePath: originFilePath,
          node: originAnalyzedImport.statementNode,
        }
      );
    }

    // First, mark each export as being barrel imported
    for (const exportEntry of targetFileDetails.exports) {
      exportEntry.barrelImportedByFiles.push(originFilePath);
      exportEntry.reexportedByFiles.push(...reexportFiles);
    }

    // Now go through reexports and traverse them further)
    for (const reexportEntry of targetFileDetails.reexports) {
      // Nothing to do in non-first party code
      if (reexportEntry.moduleType !== 'firstPartyCode') {
        continue;
      }
      if (!reexportFiles.includes(currentFile)) {
        reexportFiles.push(currentFile);
      }
      if (reexportEntry.reexportType === 'barrel') {
        reexportEntry.barrelImportedByFiles.push(originFilePath);
        traverse(reexportEntry.resolvedModulePath);
      } else {
        reexportEntry.barrelImportedByFiles.push(originFilePath);
        analyzeSingleImport(
          originFilePath,
          reexportEntry,
          analyzedProjectInfo,
          initialImportType,
          reexportFiles
        );
      }
    }
  }

  traverse(originAnalyzedImport.resolvedModulePath);
}
