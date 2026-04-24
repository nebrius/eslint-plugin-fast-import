import type {
  AnalyzedCodeFileDetails,
  AnalyzedProjectInfo,
} from '../types/analyzed.js';

/**
 * Computes cross-package import info.
 */
export function computeRepoInfo(
  analyzedProjectInfos: Map<string, AnalyzedProjectInfo>
) {
  const packageImportMap = new Map<string, AnalyzedCodeFileDetails>();

  // Initialize the package dependencies map
  for (const [, analyzedProjectInfo] of analyzedProjectInfos) {
    if (analyzedProjectInfo.packageName) {
      for (const [
        ,
        fileDetails,
      ] of analyzedProjectInfo.packageEntryPointExports) {
        if (fileDetails.entryPointSpecifier) {
          packageImportMap.set(fileDetails.entryPointSpecifier, fileDetails);
        }
      }
    }
  }

  // Reset externallyImportedBy arrays. Since we don't do more intelligent cache
  // updates for package info, we have to first reset externallyImportedBy
  // arrays, otherwise we end up with duplicates.
  for (const [, analyzedProjectInfo] of analyzedProjectInfos) {
    for (const [, fileDetails] of analyzedProjectInfo.files) {
      if (fileDetails.fileType !== 'code') {
        continue;
      }
      for (const exportEntry of fileDetails.exports) {
        exportEntry.externallyImportedBy = [];
      }
    }
  }

  // Mark entry points as imported in the monorepo
  for (const [, analyzedProjectInfo] of analyzedProjectInfos) {
    for (const [filePath, fileDetails] of analyzedProjectInfo.files) {
      if (fileDetails.fileType !== 'code') {
        continue;
      }
      for (const importEntry of [
        ...fileDetails.singleImports,
        ...fileDetails.barrelImports,
        ...fileDetails.dynamicImports,
      ]) {
        if (importEntry.resolvedModuleType !== 'thirdParty') {
          continue;
        }

        // We can't analyze dynamic import specifiers that can't be resolve
        // statically (aka moduleSpecifier is undefined), so we skip them
        if (!importEntry.moduleSpecifier) {
          continue;
        }

        // Check if this is a known package in the monorepo or not. If it's not
        // then that means it's a true third party module from npm
        const fileDetails = packageImportMap.get(importEntry.moduleSpecifier);
        if (!fileDetails) {
          continue;
        }
        switch (importEntry.type) {
          // For single imports, we need to find the specific export so we can
          // mark it as externally imported
          case 'singleImport': {
            for (const exportEntry of [
              ...fileDetails.exports,
              ...fileDetails.singleReexports,
              ...fileDetails.barrelReexports,
            ]) {
              if (exportEntry.exportName === importEntry.importName) {
                exportEntry.externallyImportedBy.push({
                  packageRootDir: analyzedProjectInfo.packageRootDir,
                  filePath,
                  importEntry,
                });
                break;
              }
            }
            break;
          }
          // For barrel imports and dynamic imports, we mark all exports as externally imported
          case 'dynamicImport':
          case 'barrelImport': {
            for (const exportEntry of [
              ...fileDetails.exports,
              ...fileDetails.singleReexports,
              ...fileDetails.barrelReexports,
            ]) {
              if (!exportEntry.exportName) {
                continue;
              }
              exportEntry.externallyImportedBy.push({
                packageRootDir: analyzedProjectInfo.packageRootDir,
                filePath,
                importEntry,
              });
            }
            break;
          }
        }
      }
    }
  }
}
