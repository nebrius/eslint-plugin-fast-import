import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type {
  DynamicImport,
  StaticExport,
  StaticExportEntry,
  StaticImport,
} from 'oxc-parser';
import oxc, { ExportImportNameKind } from 'oxc-parser';

import type { ParsedSettings } from '../settings/settings.js';
import type {
  BaseBarrelImport,
  BaseCodeFileDetails,
  BaseProjectInfo,
} from '../types/base.js';
import { getTextForRange, isCodeFile } from '../util/code.js';
import { InternalError } from '../util/error.js';
import { getFilesSync } from '../util/files.js';
import { debug } from '../util/logging.js';

type IsEntryPointCheck = (filePath: string, symbolName: string) => boolean;

type ComputeBaseInfoOptions = Pick<
  ParsedSettings,
  'rootDir' | 'fixedAliases' | 'wildcardAliases' | 'ignorePatterns'
> & {
  isEntryPointCheck?: IsEntryPointCheck;
};

/**
 * Computes base ESM info for all source files recursively found in basePath
 */
export function computeBaseInfo({
  rootDir,
  fixedAliases,
  wildcardAliases,
  ignorePatterns,
  isEntryPointCheck = () => false,
}: ComputeBaseInfoOptions): BaseProjectInfo {
  const info: BaseProjectInfo = {
    files: new Map(),
    rootDir,
    fixedAliases,
    wildcardAliases,
    availableThirdPartyDependencies: new Map(),
  };

  const { files, packageJsons } = getFilesSync(rootDir, ignorePatterns);

  for (const packageJson of packageJsons) {
    const packageJsonContents = readFileSync(packageJson, 'utf-8');
    const parsedPackageJson = JSON.parse(packageJsonContents) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const dependencies: string[] = [];
    if (parsedPackageJson.dependencies) {
      dependencies.push(...Object.keys(parsedPackageJson.dependencies));
    }
    if (parsedPackageJson.devDependencies) {
      dependencies.push(...Object.keys(parsedPackageJson.devDependencies));
    }
    if (parsedPackageJson.peerDependencies) {
      dependencies.push(...Object.keys(parsedPackageJson.peerDependencies));
    }
    info.availableThirdPartyDependencies.set(
      dirname(packageJson),
      dependencies
    );
  }

  for (const { filePath } of files) {
    if (isCodeFile(filePath)) {
      const fileContents = readFileSync(filePath, 'utf-8');
      const fileDetails = computeFileDetails({
        filePath,
        fileContents,
        isEntryPointCheck,
      });
      if (fileDetails) {
        info.files.set(filePath, fileDetails);
      }
    } else {
      info.files.set(filePath, {
        fileType: 'other',
      });
    }
  }

  return info;
}

type ComputeFileDetailsOptions = {
  filePath: string;
  fileContents: string;
  isEntryPointCheck: IsEntryPointCheck;
};

export function addBaseInfoForFile(
  { filePath, fileContents, isEntryPointCheck }: ComputeFileDetailsOptions,
  baseProjectInfo: BaseProjectInfo
) {
  if (isCodeFile(filePath)) {
    const fileDetails = computeFileDetails({
      filePath,
      fileContents,
      isEntryPointCheck,
    });
    if (fileDetails) {
      baseProjectInfo.files.set(filePath, fileDetails);
    }
  } else {
    baseProjectInfo.files.set(filePath, { fileType: 'other' });
  }
}

function hasFileChanged(
  previousFileDetails: BaseCodeFileDetails,
  updatedFileDetails: BaseCodeFileDetails
) {
  // First, check if the number of exports, reexports, or imports has changed
  if (
    updatedFileDetails.exports.length !== previousFileDetails.exports.length ||
    updatedFileDetails.reexports.length !==
      previousFileDetails.reexports.length ||
    updatedFileDetails.imports.length !== previousFileDetails.imports.length
  ) {
    return true;
  }

  // Now, compare each import and export to see if any of their details changed
  for (let i = 0; i < previousFileDetails.exports.length; i++) {
    const previousExport = previousFileDetails.exports[i];
    const updatedExport = updatedFileDetails.exports[i];
    if (previousExport.exportName !== updatedExport.exportName) {
      return true;
    }
  }
  for (let i = 0; i < previousFileDetails.reexports.length; i++) {
    const previousReexport = previousFileDetails.reexports[i];
    const updatedReexport = updatedFileDetails.reexports[i];
    if (
      previousReexport.reexportType !== updatedReexport.reexportType ||
      previousReexport.exportName !== updatedReexport.exportName ||
      previousReexport.moduleSpecifier !== previousReexport.moduleSpecifier
    ) {
      return true;
    }
  }
  for (let i = 0; i < previousFileDetails.imports.length; i++) {
    const previousImport = previousFileDetails.imports[i];
    const updatedImport = updatedFileDetails.imports[i];
    if (
      previousImport.moduleSpecifier !== updatedImport.moduleSpecifier ||
      previousImport.importType !== updatedImport.importType ||
      ('importAlias' in previousImport &&
        previousImport.importAlias !==
          (updatedImport as BaseBarrelImport).importAlias)
    ) {
      return true;
    }
  }

  return false;
}

export function updateBaseInfoForFile(
  { filePath, fileContents, isEntryPointCheck }: ComputeFileDetailsOptions,
  baseProjectInfo: BaseProjectInfo
): boolean {
  const previousFileDetails = baseProjectInfo.files.get(filePath);
  /* istanbul ignore if */
  if (!isCodeFile(filePath)) {
    throw new InternalError(
      `updateBaseInfoForFile called for non-code file ${filePath}`
    );
  }
  /* istanbul ignore if */
  if (!previousFileDetails) {
    throw new InternalError(
      `updateBaseInfoForFile called for file ${filePath} that didn't previously exist`
    );
  }
  /* istanbul ignore if */
  if (previousFileDetails.fileType !== 'code') {
    throw new InternalError(
      `previous file type was not code for file ${filePath}`
    );
  }
  const updatedFileDetails = computeFileDetails({
    filePath,
    fileContents,
    isEntryPointCheck,
  });

  if (updatedFileDetails) {
    baseProjectInfo.files.set(filePath, updatedFileDetails);
    return hasFileChanged(previousFileDetails, updatedFileDetails);
  }
  return false;
}

export function deleteBaseInfoForFile(
  filePath: string,
  baseProjectInfo: BaseProjectInfo
) {
  baseProjectInfo.files.delete(filePath);
}

function getRange(
  entry: StaticImport | StaticExportEntry | DynamicImport | StaticExport
) {
  return [entry.start, entry.end] as [number, number];
}

function computeFileDetails({
  filePath,
  fileContents,
  isEntryPointCheck,
}: ComputeFileDetailsOptions): BaseCodeFileDetails | undefined {
  const result = oxc.parseSync(filePath, fileContents);
  if (result.errors.length) {
    debug(
      `${filePath} contains syntax errors and cannot be analyzed, file will be ignored`
    );
    return;
  }

  const fileDetails: BaseCodeFileDetails = {
    fileType: 'code',
    lastUpdatedAt: Date.now(),
    imports: [],
    exports: [],
    reexports: [],
  };

  for (const importEntry of result.module.staticImports) {
    const statementNodeRange = getRange(importEntry);
    const text = getTextForRange(fileContents, statementNodeRange);
    console.log(text);
  }

  for (const importEntry of result.module.dynamicImports) {
    const statementNodeRange = getRange(importEntry);
    const text = getTextForRange(fileContents, statementNodeRange);
    console.log(text);
  }

  for (const exportEntry of result.module.staticExports) {
    const statementNodeRange = getRange(exportEntry);
    const text = getTextForRange(fileContents, statementNodeRange);
    for (const entry of exportEntry.entries) {
      const reportNodeRange = getRange(entry);
      if (entry.moduleRequest) {
        const moduleSpecifier = entry.moduleRequest.value;
        const isBarrel =
          entry.importName.kind === ExportImportNameKind.All || // with alias
          entry.importName.kind === ExportImportNameKind.AllButDefault; // no alias
        if (isBarrel) {
          fileDetails.reexports.push({
            reexportType: 'barrel',
            moduleSpecifier,
            exportName,
            isTypeReexport,
            isEntryPoint: isEntryPointCheck(filePath, exportName),
            statementNodeRange,
            reportNodeRange,
          });
        } else {
          fileDetails.reexports.push({
            reexportType: 'single',
            moduleSpecifier,
            importName,
            exportName,
            isTypeReexport,
            isEntryPoint: isEntryPointCheck(filePath, exportName),
            statementNodeRange,
            reportNodeRange,
          });
        }
      } else {
        //
      }
      /*
      
        moduleRequest?: ValueSpan
        ** The name under which the desired binding is exported by the module`. *
        importName: ExportImportName
        ** The name used to export this binding by this module. *
        exportName: ExportExportName
        ** The name that is used to locally access the exported value from within the importing module. *
        localName: ExportLocalName
      */
    }
  }
}
