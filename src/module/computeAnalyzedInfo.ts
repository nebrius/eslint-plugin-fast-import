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
          };
          analyzedFileInfo.reexports.push(analyzedSingleReexport);
          break;
        }
        case 'barrel': {
          const analyzedSingleReexport: AnalyzedBarrelReexport = {
            ...reexportDetails,
            importedByFiles: [],
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
        analyzeSingleImport(filePath, importDetails, analyzedProjectInfo);
      } else {
        analyzeBarrelImport(filePath, importDetails, analyzedProjectInfo);
      }
    }
  }

  // TODO: Handle export/reexports that are entry points

  return analyzedProjectInfo;
}

function analyzeSingleImport(
  filePath: string,
  analyzedImport: AnalyzedSingleImport,
  analyzedProjectInfo: AnalyzedProjectInfo
) {
  if (analyzedImport.moduleType !== 'firstPartyCode') {
    return;
  }

  const reexportFiles: string[] = [];

  // Return value indicates if we've found the root export yet or not
  function traverse(currentFile: string, currentImportName: string): boolean {
    // Get the file from the project info
    const targetFileDetails = analyzedProjectInfo.files[currentFile];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!targetFileDetails) {
      throw new InternalError(
        `File ${currentFile} is missing in project info`,
        {
          filePath,
          node: analyzedImport.statementNode,
        }
      );
    }

    // Shouldn't happen in practice, but check anyways to make TypeScript happy, plus "shouldn't happen" has a funny way
    // of coming true sometimes
    if (targetFileDetails.fileType !== 'code') {
      throw new InternalError(
        `moduleType on source is "code", but ${currentFile} type is not code`,
        {
          filePath,
          node: analyzedImport.statementNode,
        }
      );
    }

    // First, check if we've found the root export
    const exportEntry = targetFileDetails.exports.find(
      (e) => currentImportName === e.exportName
    );
    if (exportEntry?.exportName === currentImportName) {
      // Set the root data for the analyzed import
      analyzedImport.rootModuleType = 'firstPartyCode';

      // Force TypeScript type narrowing on the value we just set
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (analyzedImport.rootModuleType === 'firstPartyCode') {
        analyzedImport.rootModulePath = currentFile;
        analyzedImport.rootName = exportEntry.exportName;
      }

      // Set the consumers of the export
      exportEntry.importedByFiles.push(filePath);
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
          analyzedImport.rootModuleType = singleReexportEntry.moduleType;
          return true;
        }
        case 'firstPartyOther': {
          // Set the root data for the analyzed import
          analyzedImport.rootModuleType = 'firstPartyOther';

          // Force TypeScript type narrowing on the value we just set
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (analyzedImport.rootModuleType === 'firstPartyOther') {
            analyzedImport.rootModulePath = currentFile;
          }
          return true;
        }
        case 'firstPartyCode': {
          reexportFiles.push(currentFile);
          singleReexportEntry.importedByFiles.push(filePath);
          return traverse(
            singleReexportEntry.resolvedModulePath,
            singleReexportEntry.importName
          );
        }
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
      if (traverse(reexportEntry.resolvedModulePath, currentImportName)) {
        // For some reason TypeScript isn't narrowing this type to a barrel reexport, maybe due to the moduleType check?
        (reexportEntry as AnalyzedBarrelReexport).importedByFiles.push(
          filePath
        );
        return true;
      }
    }

    // Finally, if we got here, we couldn't resolve the root export
    return false;
  }

  traverse(analyzedImport.resolvedModulePath, analyzedImport.importName);
}

function analyzeBarrelImport(
  // @ts-expect-error
  filePath: string,
  analyzedImport: AnalyzedBarrelImport | AnalyzedDynamicImport,
  // @ts-expect-error
  analyzedProjectInfo: AnalyzedProjectInfo
) {
  if (analyzedImport.moduleType !== 'firstPartyCode') {
    return;
  }
  // TODO
}
