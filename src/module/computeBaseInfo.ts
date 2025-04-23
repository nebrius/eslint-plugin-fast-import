import { dirname } from 'node:path';

import type { TSESTree } from '@typescript-eslint/utils';

import type { ParsedSettings } from '../settings/settings.js';
import type {
  BaseCodeFileDetails,
  BaseESMStatement,
  BaseProjectInfo,
} from '../types/base.js';
import { isCodeFile } from '../util/code.js';
import { InternalError } from '../util/error.js';
import { getDependenciesFromPackageJson, getFilesSync } from '../util/files.js';
import { computeFileDetails } from './computeBaseFileDetails.js';
import { computeBaseFileInfoForFilesSync } from './computeBaseInfoOrchestrator.js';

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
    info.availableThirdPartyDependencies.set(
      dirname(packageJson),
      getDependenciesFromPackageJson(packageJson)
    );
  }

  const codeFilesToProcess: string[] = [];
  for (const { filePath } of files) {
    if (isCodeFile(filePath)) {
      codeFilesToProcess.push(filePath);
    } else {
      info.files.set(filePath, {
        fileType: 'other',
      });
    }
  }

  const results = computeBaseFileInfoForFilesSync(
    codeFilesToProcess,
    isEntryPointCheck
  );

  for (const { filePath, fileDetails } of results) {
    info.files.set(filePath, fileDetails);
  }

  return info;
}

type ComputeFileDetailsOptions = {
  filePath: string;
  fileContents: string;
  ast: TSESTree.Program;
  isEntryPointCheck: IsEntryPointCheck;
};

export function addBaseInfoForFile(
  { filePath, fileContents, ast, isEntryPointCheck }: ComputeFileDetailsOptions,
  baseProjectInfo: BaseProjectInfo
) {
  if (isCodeFile(filePath)) {
    const fileDetails = computeFileDetails({
      filePath,
      fileContents,
      ast,
      isEntryPointCheck,
    });
    baseProjectInfo.files.set(filePath, fileDetails);
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
  { filePath, fileContents, ast, isEntryPointCheck }: ComputeFileDetailsOptions,
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
    ast,
    isEntryPointCheck,
  });

  baseProjectInfo.files.set(filePath, updatedFileDetails);
  return hasFileChanged(previousFileDetails, updatedFileDetails);
}

export function deleteBaseInfoForFile(
  filePath: string,
  baseProjectInfo: BaseProjectInfo
) {
  baseProjectInfo.files.delete(filePath);
}
