import { InternalError } from '../util/error';
import type {
  AnalyzedBarrelImport,
  AnalyzedBarrelReexport,
  AnalyzedCodeFileDetails,
  AnalyzedDynamicImport,
  AnalyzedProjectInfo,
  AnalyzedSingleImport,
  AnalyzedSingleReexport,
} from '../types/analyzed';
import type { ResolvedProjectInfo } from '../types/resolved';

// TODO: places were `as` casts are used indicate an issue with the analyzed type definitions that don't narrow
// correctly and should be fixed

export function computeAnalyzedInfo(
  resolvedProjectInfo: ResolvedProjectInfo
): AnalyzedProjectInfo {
  const analyzedProjectInfo: AnalyzedProjectInfo = {
    ...resolvedProjectInfo,
    files: {},
  };

  // First we initialize each detail with placeholder data, since we need a completely initialized `analyzedInfo` object
  // available before we can start traversing/populating analyzed info
  for (const [filePath, fileDetails] of Object.entries(
    resolvedProjectInfo.files
  )) {
    if (fileDetails.fileType !== 'code') {
      analyzedProjectInfo.files[filePath] = {
        fileType: 'other',
      };
      continue;
    }

    const analyzedFileInfo: AnalyzedCodeFileDetails = {
      fileType: 'code',
      imports: [],
      exports: [],
      reexports: [],
    };
    analyzedProjectInfo.files[filePath] = analyzedFileInfo;

    for (const exportDetails of fileDetails.exports) {
      analyzedFileInfo.exports.push({
        ...exportDetails,
        importedByFiles: [],
        barrelImportedByFiles: [],
        reexportedByFiles: [],
      });
    }

    for (const reexportDetails of fileDetails.reexports) {
      // For some reason, type narrowing isn't working on this one, so I have to manually set the top on a const and
      // then push the variable into the array
      switch (reexportDetails.reexportType) {
        case 'single': {
          const analyzedSingleReexport: AnalyzedSingleReexport = {
            ...reexportDetails,
            // We don't know what the type is yet, but once we determine the type we'll change this value and
            // potentially fill in other details
            rootModuleType: undefined,
            importedByFiles: [],
            barrelImportedByFiles: [],
          };
          analyzedFileInfo.reexports.push(analyzedSingleReexport);
          break;
        }
        case 'barrel': {
          const analyzedSingleReexport: AnalyzedBarrelReexport = {
            ...reexportDetails,
            importedByFiles: [],
            barrelImportedByFiles: [],
          };
          analyzedFileInfo.reexports.push(analyzedSingleReexport);
          break;
        }
      }
    }

    for (const importDetails of fileDetails.imports) {
      switch (importDetails.importType) {
        case 'single': {
          const analyzedSingleReexport: AnalyzedSingleImport = {
            ...importDetails,
            // We don't know what the type is yet, but once we determine the type we'll change this value and
            // potentially fill in other details
            rootModuleType: undefined,
          };
          analyzedFileInfo.imports.push(analyzedSingleReexport);
          break;
        }
        case 'barrel': {
          const analyzedSingleReexport: AnalyzedBarrelImport = {
            ...importDetails,
          };
          analyzedFileInfo.imports.push(analyzedSingleReexport);
          break;
        }
      }
    }
  }

  // Now that we have placeholder values for each entry, we're ready to analyze/traverse the tree
  for (const [filePath, fileDetails] of Object.entries(
    analyzedProjectInfo.files
  )) {
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
  }

  // TODO: Handle export/reexports that are entry points

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
  function traverse(currentFile: string, currentImportName: string): boolean {
    // Get the file from the project info
    const targetFileDetails = analyzedProjectInfo.files[currentFile];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
      // Set the root data for the analyzed import
      originAnalyzedImport.rootModuleType = 'firstPartyCode';

      // Force TypeScript type narrowing on the value we just set
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (originAnalyzedImport.rootModuleType === 'firstPartyCode') {
        originAnalyzedImport.rootModulePath = currentFile;
        originAnalyzedImport.rootName = exportEntry.exportName;
        originAnalyzedImport.rootExportType = 'export';
      }

      // Set the consumers of the export
      exportEntry.importedByFiles.push(originFilePath);
      exportEntry.reexportedByFiles.push(...reexportFiles);
      return true;
    }

    // Next, check if there is a single re-export that matches
    const singleReexportEntry = targetFileDetails.reexports.find(
      (r) => r.reexportType === 'single' && r.exportName === currentImportName
    ) as AnalyzedSingleReexport | undefined;
    if (singleReexportEntry) {
      switch (singleReexportEntry.moduleType) {
        case 'builtin':
        case 'thirdParty': {
          originAnalyzedImport.rootModuleType = singleReexportEntry.moduleType;
          return true;
        }
        case 'firstPartyOther': {
          // Set the root data for the analyzed import
          originAnalyzedImport.rootModuleType = 'firstPartyOther';

          // Force TypeScript type narrowing on the value we just set
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (originAnalyzedImport.rootModuleType === 'firstPartyOther') {
            originAnalyzedImport.rootModulePath = currentFile;
          }
          return true;
        }
        case 'firstPartyCode': {
          reexportFiles.push(currentFile);
          singleReexportEntry.importedByFiles.push(originFilePath);
          return traverse(
            singleReexportEntry.resolvedModulePath,
            singleReexportEntry.importName
          );
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
          // Set the root data for the analyzed import
          originAnalyzedImport.rootModuleType = 'firstPartyCode';

          // Force TypeScript type narrowing on the value we just set
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (originAnalyzedImport.rootModuleType === 'firstPartyCode') {
            originAnalyzedImport.rootModulePath = currentFile;
            originAnalyzedImport.rootName = barrelReexportEntry.exportName;
            originAnalyzedImport.rootExportType = 'namedBarrelReexport';
          }
        }

        analyzeBarrelImport(
          originFilePath,
          barrelReexportEntry,
          analyzedProjectInfo,
          initialImportType,
          reexportFiles
        );
      }
      return true;
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
      if (traverse(reexportEntry.resolvedModulePath, currentImportName)) {
        (reexportEntry as AnalyzedBarrelReexport).importedByFiles.push(
          originFilePath
        );
        return true;
      }
    }

    // Finally, if we got here, we couldn't resolve the root export
    return false;
  }

  traverse(
    originAnalyzedImport.resolvedModulePath,
    originAnalyzedImport.importName
  );
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
    const targetFileDetails = analyzedProjectInfo.files[currentFile];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
      reexportFiles.push(currentFile);
      if (reexportEntry.reexportType === 'barrel') {
        (reexportEntry as AnalyzedBarrelReexport).barrelImportedByFiles.push(
          originFilePath
        );
        traverse(reexportEntry.resolvedModulePath);
      } else {
        (reexportEntry as AnalyzedSingleReexport).barrelImportedByFiles.push(
          originFilePath
        );
        analyzeSingleImport(
          originFilePath,
          reexportEntry as AnalyzedSingleReexport,
          analyzedProjectInfo,
          initialImportType,
          reexportFiles
        );
      }
    }
  }

  traverse(originAnalyzedImport.resolvedModulePath);
}
