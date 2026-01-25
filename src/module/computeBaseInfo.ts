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
  BaseCodeFileDetails,
  BaseESMStatement,
  BaseProjectInfo,
} from '../types/base.js';
import { getTextForRange, isCodeFile } from '../util/code.js';
import { InternalError } from '../util/error.js';
import { getDependenciesFromPackageJson, getFilesSync } from '../util/files.js';
import { debug } from '../util/logging.js';

type IsEntryPointCheck = (filePath: string, symbolName: string) => boolean;

type ComputeBaseInfoOptions = Pick<
  ParsedSettings,
  | 'rootDir'
  | 'fixedAliases'
  | 'wildcardAliases'
  | 'ignorePatterns'
  | 'ignoreOverridePatterns'
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
  ignoreOverridePatterns,
  isEntryPointCheck = () => false,
}: ComputeBaseInfoOptions): BaseProjectInfo {
  const info: BaseProjectInfo = {
    files: new Map(),
    rootDir,
    fixedAliases,
    wildcardAliases,
    availableThirdPartyDependencies: new Map(),
  };

  const { files, packageJsons } = getFilesSync(
    rootDir,
    ignorePatterns,
    ignoreOverridePatterns
  );

  for (const packageJson of packageJsons) {
    info.availableThirdPartyDependencies.set(
      dirname(packageJson),
      getDependenciesFromPackageJson(packageJson)
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

function hasEsmEntryChanged<T extends BaseESMStatement>(
  previous: T,
  updated: T
) {
  for (const key of Object.keys(previous)) {
    if (key === 'statementNodeRange' || key === 'reportNodeRange') {
      continue;
    }
    if (
      (previous as Record<string, unknown>)[key] !==
      (updated as Record<string, unknown>)[key]
    ) {
      return true;
    }
  }
  return false;
}

function hasFileChanged(
  previousFileDetails: BaseCodeFileDetails,
  updatedFileDetails: BaseCodeFileDetails
) {
  // First, check if the number of esm statements have changed
  if (
    updatedFileDetails.exports.length !== previousFileDetails.exports.length ||
    updatedFileDetails.singleImports.length !==
      previousFileDetails.singleImports.length ||
    updatedFileDetails.barrelImports.length !==
      previousFileDetails.barrelImports.length ||
    updatedFileDetails.dynamicImports.length !==
      previousFileDetails.dynamicImports.length ||
    updatedFileDetails.singleReexports.length !==
      previousFileDetails.singleReexports.length ||
    updatedFileDetails.barrelReexports.length !==
      previousFileDetails.barrelReexports.length
  ) {
    return true;
  }

  // Now, compare each ESM statement to see if any of their details changed
  for (let i = 0; i < previousFileDetails.exports.length; i++) {
    const previousExport = previousFileDetails.exports[i];
    const updatedExport = updatedFileDetails.exports[i];
    if (hasEsmEntryChanged(previousExport, updatedExport)) {
      return true;
    }
  }
  for (let i = 0; i < previousFileDetails.singleReexports.length; i++) {
    const previousReexport = previousFileDetails.singleReexports[i];
    const updatedReexport = updatedFileDetails.singleReexports[i];
    if (hasEsmEntryChanged(previousReexport, updatedReexport)) {
      return true;
    }
  }
  for (let i = 0; i < previousFileDetails.barrelReexports.length; i++) {
    const previousReexport = previousFileDetails.barrelReexports[i];
    const updatedReexport = updatedFileDetails.barrelReexports[i];
    if (hasEsmEntryChanged(previousReexport, updatedReexport)) {
      return true;
    }
  }
  for (let i = 0; i < previousFileDetails.singleImports.length; i++) {
    const previousImport = previousFileDetails.singleImports[i];
    const updatedImport = updatedFileDetails.singleImports[i];
    if (hasEsmEntryChanged(previousImport, updatedImport)) {
      return true;
    }
  }
  for (let i = 0; i < previousFileDetails.barrelImports.length; i++) {
    const previousImport = previousFileDetails.barrelImports[i];
    const updatedImport = updatedFileDetails.barrelImports[i];
    if (hasEsmEntryChanged(previousImport, updatedImport)) {
      return true;
    }
  }
  for (let i = 0; i < previousFileDetails.dynamicImports.length; i++) {
    const previousImport = previousFileDetails.dynamicImports[i];
    const updatedImport = updatedFileDetails.dynamicImports[i];
    if (hasEsmEntryChanged(previousImport, updatedImport)) {
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
  }
  return (
    !!updatedFileDetails &&
    hasFileChanged(previousFileDetails, updatedFileDetails)
  );
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
    if (!start || !end) {
      if (fallBack) {
        return fallBack;
      }
      /* istanbul ignore next */
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
      `${filePath} contains syntax errors and cannot be analyzed. File will be ignored`
    );
    return;
  }

  const fileDetails: BaseCodeFileDetails = {
    fileType: 'code',
    lastUpdatedAt: Date.now(),
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    singleReexports: [],
    barrelReexports: [],
    exports: [],
    hasEntryPoints: false,
  };

  let hasEntryPoints = false;

  for (const importEntry of result.module.staticImports) {
    const statementNodeRange = getRange(importEntry);
    const moduleSpecifier = importEntry.moduleRequest.value;
    for (const entry of importEntry.entries) {
      const reportNodeRange = getRange(entry);
      const importAlias = entry.localName.value;

      // Check if this is a barrel import
      if (entry.importName.kind === 'NamespaceObject') {
        fileDetails.barrelImports.push({
          type: 'barrelImport',
          importAlias,
          statementNodeRange,
          reportNodeRange,
          moduleSpecifier,
        });
      } else {
        const importName =
          entry.importName.kind === 'Default'
            ? 'default'
            : entry.importName.name;
        /* istanbul ignore if */
        if (!importName) {
          throw new InternalError(`importName is undefined`);
        }
        fileDetails.singleImports.push({
          type: 'singleImport',
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

    // Make sure we parsed the text correctly
    /* istanbul ignore if */
    if (result.errors.length || result.program.body.length !== 1) {
      throw new InternalError(`Error reparsing "${moduleSpecifierText}"`, {
        filePath,
        range: [importEntry.moduleRequest.start, importEntry.moduleRequest.end],
      });
    }

    // Check if it's a string literal. If not, we don't analyze
    if (
      result.program.body[0].type === 'ExpressionStatement' &&
      result.program.body[0].expression.type === 'Literal' &&
      typeof result.program.body[0].expression.value === 'string'
    ) {
      fileDetails.dynamicImports.push({
        type: 'dynamicImport',
        statementNodeRange,
        reportNodeRange: statementNodeRange,
        moduleSpecifier: result.program.body[0].expression.value,
      });
    } else {
      debug(
        `dynamic import ${moduleSpecifierText} in ${filePath} cannot be analyzed statically and will be ignored`
      );
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
          const isEntryPoint = exportName
            ? isEntryPointCheck(filePath, exportName)
            : false;
          if (isEntryPoint) {
            hasEntryPoints = true;
          }
          fileDetails.barrelReexports.push({
            type: 'barrelReexport',
            moduleSpecifier,
            exportName: exportName ?? undefined,
            isEntryPoint,
            statementNodeRange,
            reportNodeRange,
          });
        } else {
          const importName = entry.importName.name;
          /* istanbul ignore if */
          if (!importName) {
            throw new InternalError(`importName is undefined`);
          }
          const exportName = entry.exportName.name;
          /* istanbul ignore if */
          if (!exportName) {
            throw new InternalError(`exportName is undefined`);
          }
          const isEntryPoint = isEntryPointCheck(filePath, exportName);
          if (isEntryPoint) {
            hasEntryPoints = true;
          }
          fileDetails.singleReexports.push({
            type: 'singleReexport',
            moduleSpecifier,
            importName,
            exportName,
            isTypeReexport: entry.isType,
            isEntryPoint,
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
        /* istanbul ignore if */
        if (!exportName) {
          throw new InternalError(`exportName is undefined`);
        }
        const isEntryPoint = isEntryPointCheck(filePath, exportName);
        if (isEntryPoint) {
          hasEntryPoints = true;
        }
        fileDetails.exports.push({
          type: 'export',
          exportName,
          isEntryPoint,
          isTypeExport: entry.isType,
          statementNodeRange,
          reportNodeRange,
        });
      }
    }
  }

  if (hasEntryPoints) {
    fileDetails.hasEntryPoints = true;
  }

  // De-dupe exports with the same name (e.g. TypeScript function overloads).
  // We keep the last occurrence, which is the actual implementation, because
  // this is the version that users will want to actually see. This is why
  // we filter exports in reverse order after our previous loop, not inline.
  const seenExportNames = new Set<string>();
  for (let i = fileDetails.exports.length - 1; i >= 0; i--) {
    const exportEntry = fileDetails.exports[i];
    if (seenExportNames.has(exportEntry.exportName)) {
      fileDetails.exports.splice(i, 1);
    } else {
      seenExportNames.add(exportEntry.exportName);
    }
  }

  return fileDetails;
}
