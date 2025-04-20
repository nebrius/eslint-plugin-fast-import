import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type {
  DynamicImport,
  StaticExport,
  StaticExportEntry,
  StaticImport,
  StaticImportEntry,
} from 'oxc-parser';
import { parseSync } from 'oxc-parser';

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
  entry:
    | StaticImport
    | StaticImportEntry
    | DynamicImport
    | StaticExport
    | StaticExportEntry,
  fallBack?: [number, number]
): [number, number] {
  // Import entries are a little different
  if ('localName' in entry) {
    const start = entry.importName.start ?? entry.localName.start;
    const end = entry.localName.start ?? entry.importName.start;

    // This shouldn't happen in practice, but oxc's types are defined rather
    // loosely, marking entries as optional instead of using unions to indicate
    // when values are undefined.
    if (start === undefined || end === undefined) {
      if (fallBack) {
        return fallBack;
      }
      throw new InternalError('Could not get range for import entry');
    }
    return [start, end];
  }
  return [entry.start, entry.end];
}

function computeFileDetails({
  filePath,
  fileContents,
  isEntryPointCheck,
}: ComputeFileDetailsOptions): BaseCodeFileDetails | undefined {
  const result = parseSync(filePath, fileContents, {
    sourceType: 'module',
  });
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
    const moduleSpecifier = importEntry.moduleRequest.value;
    for (const entry of importEntry.entries) {
      const reportNodeRange = getRange(entry);
      const importAlias = entry.localName.value;

      // Check if this is a barrel import
      if (entry.importName.kind === 'NamespaceObject') {
        fileDetails.imports.push({
          importType: 'barrel',
          importAlias,
          statementNodeRange,
          reportNodeRange,
          moduleSpecifier,
          isTypeImport: entry.isType,
        });
      } else {
        const importName =
          entry.importName.kind === 'Default'
            ? 'default'
            : entry.importName.name;
        if (!importName) {
          throw new InternalError(`importName is undefined`);
        }
        fileDetails.imports.push({
          importType: 'single',
          importName,
          importAlias,
          statementNodeRange,
          reportNodeRange,
          moduleSpecifier,
          isTypeImport: entry.isType,
        });
      }
    }
  }

  for (const importEntry of result.module.dynamicImports) {
    const statementNodeRange = getRange(importEntry);

    // Unfortunately OXC only gives us the range of the specifier, but not what
    // it is. We extract this out and reparse it to see what it contains
    const moduleSpecifierText = getTextForRange(fileContents, [
      importEntry.moduleRequest.start,
      importEntry.moduleRequest.end,
    ]);

    const result = parseSync(randomUUID() + '.ts', moduleSpecifierText);

    if (
      // Make sure the program parsed and has 1 statemnt
      !result.errors.length &&
      result.program.body.length === 1 &&
      // Make sure it's a string literal
      result.program.body[0].type === 'ExpressionStatement' &&
      result.program.body[0].expression.type === 'Literal' &&
      typeof result.program.body[0].expression.value === 'string'
    ) {
      fileDetails.imports.push({
        importType: 'dynamic',
        statementNodeRange,
        reportNodeRange: statementNodeRange,
        moduleSpecifier: result.program.body[0].expression.value,
      });
    }
  }

  for (const exportEntry of result.module.staticExports) {
    const statementNodeRange = getRange(exportEntry);
    for (const entry of exportEntry.entries) {
      const reportNodeRange = getRange(entry, statementNodeRange);

      // Check if this is a reexport
      if (entry.moduleRequest) {
        const moduleSpecifier = entry.moduleRequest.value;
        const isBarrel =
          // All indicates there is an alias, aka `export * as a from './a'`
          entry.importName.kind === 'All' ||
          // AllButDefault indicates there is not an alias, aka `export * from './a'`
          entry.importName.kind === 'AllButDefault';

        if (isBarrel) {
          const exportName = entry.exportName.name;
          fileDetails.reexports.push({
            reexportType: 'barrel',
            moduleSpecifier,
            exportName,
            // TODO: https://github.com/oxc-project/oxc/issues/10505
            isTypeReexport: false,
            isEntryPoint: exportName
              ? isEntryPointCheck(filePath, exportName)
              : false,
            statementNodeRange,
            reportNodeRange,
          });
        } else {
          const importName = entry.importName.name;
          if (!importName) {
            throw new InternalError(`importName is undefined`);
          }
          const exportName = entry.exportName.name;
          if (!exportName) {
            throw new InternalError(`exportName is undefined`);
          }
          fileDetails.reexports.push({
            reexportType: 'single',
            moduleSpecifier,
            importName,
            exportName,
            // TODO: https://github.com/oxc-project/oxc/issues/10505
            isTypeReexport: false,
            isEntryPoint: isEntryPointCheck(filePath, exportName),
            statementNodeRange,
            reportNodeRange,
          });
        }
      }

      // Otherwise this is a standard export, not a reexport
      else {
        const exportName =
          entry.exportName.kind === 'Default'
            ? 'default'
            : entry.exportName.name;
        if (!exportName) {
          throw new InternalError(`exportName is undefined`);
        }
        fileDetails.exports.push({
          exportName,
          isEntryPoint: isEntryPointCheck(filePath, exportName),
          statementNodeRange,
          reportNodeRange,
        });
      }
    }
  }

  return fileDetails;
}
