import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { TSESTree } from '@typescript-eslint/utils';

import type { ParsedSettings } from '../settings/settings.js';
import { getEslintConfigDir } from '../settings/util.js';
import type {
  BaseBarrelImport,
  BaseCodeFileDetails,
  BaseProjectInfo,
} from '../types/base.js';
import { isCodeFile } from '../util/code.js';
import { InternalError } from '../util/error.js';
import { getFilesSync } from '../util/files.js';
import { computeFileDetails } from './computeBaseFileDetails.js';
import {
  computeBaseFileInfoForFilesInProcess,
  computeBaseFileInfoForFilesSync,
} from './computeBaseInfoOrchestrator.js';

type IsEntryPointCheck = (filePath: string, symbolName: string) => boolean;

type ComputeBaseInfoOptions = Pick<
  ParsedSettings,
  | 'rootDir'
  | 'fixedAliases'
  | 'wildcardAliases'
  | 'ignorePatterns'
  | 'entryPoints'
  | 'parallelizationMode'
>;

/**
 * Computes base ESM info for all source files recursively found in basePath
 */
export function computeBaseInfo({
  rootDir,
  fixedAliases,
  wildcardAliases,
  ignorePatterns,
  entryPoints,
  parallelizationMode,
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

  const options = {
    eslintConfigDir: getEslintConfigDir(codeFilesToProcess[0]),
    entryPoints,
    filePaths: codeFilesToProcess,
  };
  const mode =
    parallelizationMode === 'auto'
      ? codeFilesToProcess.length > 1_000
        ? 'multiProcess'
        : 'singleProcess'
      : parallelizationMode;

  const results =
    mode === 'multiProcess'
      ? computeBaseFileInfoForFilesInProcess(options)
      : computeBaseFileInfoForFilesSync(options);

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
    baseProjectInfo.files.set(
      filePath,
      computeFileDetails({
        filePath,
        fileContents,
        ast,
        isEntryPointCheck,
      })
    );
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
