import { builtinModules } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';

import type { BaseCodeFileDetails, BaseProjectInfo } from '../types/base.js';
import type {
  Resolved,
  ResolvedCodeFileDetails,
  ResolvedProjectInfo,
} from '../types/resolved.js';
import { isCodeFile } from '../util/code.js';
import { InternalError } from '../util/error.js';
import {
  getRelativePathFromRoot,
  splitPathIntoSegments,
} from '../util/files.js';

export function computeResolvedInfo(
  baseProjectInfo: BaseProjectInfo
): ResolvedProjectInfo {
  // Always recompute the folder tree when we're starting from scratch
  computeFolderTree(baseProjectInfo);

  const resolvedProjectInfo: ResolvedProjectInfo = {
    ...baseProjectInfo,
    files: new Map(),
  };

  for (const [filePath, baseFileDetails] of baseProjectInfo.files) {
    if (baseFileDetails.fileType !== 'code') {
      resolvedProjectInfo.files.set(filePath, {
        fileType: 'other',
      });
      continue;
    }
    const resolvedCodeFileDetails: ResolvedCodeFileDetails = {
      fileType: 'code',
      hasEntryPoints: baseFileDetails.hasEntryPoints,
      lastUpdatedAt: baseFileDetails.lastUpdatedAt,
      exports: [],
      singleImports: [],
      barrelImports: [],
      dynamicImports: [],
      singleReexports: [],
      barrelReexports: [],
    };
    resolvedProjectInfo.files.set(filePath, resolvedCodeFileDetails);
    populateFileDetails(
      baseProjectInfo,
      filePath,
      baseFileDetails,
      resolvedCodeFileDetails
    );
  }
  return resolvedProjectInfo;
}

export function addResolvedInfoForFile(
  filePath: string,
  newBaseProjectInfo: BaseProjectInfo,
  previousResolvedProjectInfo: ResolvedProjectInfo
) {
  const baseFileInfo = newBaseProjectInfo.files.get(filePath);
  /* istanbul ignore if */
  if (!baseFileInfo) {
    throw new InternalError(`Could not get base file info for ${filePath}`);
  }
  if (isCodeFile(filePath)) {
    /* istanbul ignore if */
    if (baseFileInfo.fileType !== 'code') {
      throw new InternalError(`Mismatched file types for ${filePath}`);
    }
    const resolvedCodeFileDetails: ResolvedCodeFileDetails = {
      fileType: 'code',
      hasEntryPoints: baseFileInfo.hasEntryPoints,
      lastUpdatedAt: baseFileInfo.lastUpdatedAt,
      exports: [],
      singleImports: [],
      barrelImports: [],
      dynamicImports: [],
      singleReexports: [],
      barrelReexports: [],
    };
    previousResolvedProjectInfo.files.set(filePath, resolvedCodeFileDetails);
    populateFileDetails(
      newBaseProjectInfo,
      filePath,
      baseFileInfo,
      resolvedCodeFileDetails
    );
  } else {
    previousResolvedProjectInfo.files.set(filePath, {
      fileType: 'other',
    });
  }
}

export function updateResolvedInfoForFile(
  filePath: string,
  baseProjectInfo: BaseProjectInfo,
  resolvedProjectInfo: ResolvedProjectInfo
) {
  const filePathsToUpdate = [
    filePath,
    ...getFileReferences(resolvedProjectInfo, filePath),
  ];
  for (const filePathToUpdate of filePathsToUpdate) {
    const baseFileInfo = baseProjectInfo.files.get(filePathToUpdate);
    /* istanbul ignore if */
    if (!baseFileInfo) {
      throw new InternalError(
        `Could not get base file info for ${filePathToUpdate}`
      );
    }
    /* istanbul ignore if */
    if (baseFileInfo.fileType !== 'code') {
      throw new InternalError(`Mismatched file types for ${filePathToUpdate}`);
    }
    const resolvedCodeFileDetails: ResolvedCodeFileDetails = {
      fileType: 'code',
      hasEntryPoints: baseFileInfo.hasEntryPoints,
      lastUpdatedAt: baseFileInfo.lastUpdatedAt,
      exports: [],
      singleImports: [],
      barrelImports: [],
      dynamicImports: [],
      singleReexports: [],
      barrelReexports: [],
    };
    populateFileDetails(
      baseProjectInfo,
      filePathToUpdate,
      baseFileInfo,
      resolvedCodeFileDetails
    );
    resolvedProjectInfo.files.set(filePathToUpdate, resolvedCodeFileDetails);
  }
}

export function deleteResolvedInfoForFile(
  filePath: string,
  newBaseProjectInfo: BaseProjectInfo,
  previousResolvedProjectInfo: ResolvedProjectInfo
) {
  const baseFileInfo = newBaseProjectInfo.files.get(filePath);
  /* istanbul ignore if */
  if (!baseFileInfo) {
    throw new InternalError(`Could not get base file info for ${filePath}`);
  }

  const filePathsToUpdate = getFileReferences(
    previousResolvedProjectInfo,
    filePath
  );
  for (const filePathToUpdate of filePathsToUpdate) {
    const fileDetailsToUpdate =
      previousResolvedProjectInfo.files.get(filePathToUpdate);

    /* instanbul ignore if */
    if (!fileDetailsToUpdate) {
      throw new InternalError(
        'filePathToUpdate missing in resolved project info'
      );
    }

    /* istanbul ignore if */
    if (fileDetailsToUpdate.fileType !== 'code') {
      throw new InternalError('fileDetailsToUpdate is not a code file');
    }

    // We have to wait to delete the file info until after we're done fetching
    // related files, since we use info about this first file in the search.
    // However, we also have to delete this before we actually process the files
    // needing updates so they don't think the file is still there
    previousResolvedProjectInfo.files.delete(filePath);

    const resolvedCodeFileDetails: ResolvedCodeFileDetails = {
      fileType: 'code',
      hasEntryPoints: fileDetailsToUpdate.hasEntryPoints,
      lastUpdatedAt: fileDetailsToUpdate.lastUpdatedAt,
      exports: [],
      singleImports: [],
      barrelImports: [],
      dynamicImports: [],
      singleReexports: [],
      barrelReexports: [],
    };
    previousResolvedProjectInfo.files.set(
      filePathToUpdate,
      resolvedCodeFileDetails
    );
    populateFileDetails(
      newBaseProjectInfo,
      filePathToUpdate,
      fileDetailsToUpdate,
      resolvedCodeFileDetails
    );
  }
}

export function computeFolderTree(baseInfo: BaseProjectInfo) {
  // Reset the cache before we start
  folderTree = {
    folders: {},
    files: {},
    filesAndExtensions: {},
  };
  for (const [file] of baseInfo.files) {
    const folders = splitPathIntoSegments(
      getRelativePathFromRoot(baseInfo.rootDir, file)
    );
    const basefile = folders.pop();
    /* istanbul ignore if */
    if (!basefile) {
      throw new InternalError(`Could not get basefile for path ${file}`);
    }

    let currentFolderTreeNode = folderTree;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const currentFolder = folders.shift();
      if (!currentFolder) {
        break;
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!currentFolderTreeNode.folders[currentFolder]) {
        currentFolderTreeNode.folders[currentFolder] = {
          folders: {},
          files: {},
          filesAndExtensions: {},
        };
      }
      currentFolderTreeNode = currentFolderTreeNode.folders[currentFolder];
    }

    currentFolderTreeNode.files[basefile] = 1;
    const extension = basefile.endsWith('.d.ts')
      ? '.d.ts'
      : basefile.endsWith('.d.tsx')
        ? '.d.tsx'
        : extname(basefile);
    const baseFileName = basename(basefile, extension);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentFolderTreeNode.filesAndExtensions[baseFileName]) {
      currentFolderTreeNode.filesAndExtensions[baseFileName] = [];
    }
    currentFolderTreeNode.filesAndExtensions[baseFileName].push(extension);
  }
}

// Find all files that import/reexport from this file, or that this file is imported from
function getFileReferences(
  previousResolvedProjectInfo: ResolvedProjectInfo,
  filePath: string
) {
  const fileReferences = [];
  const previousResolvedFileEntry =
    previousResolvedProjectInfo.files.get(filePath);
  /* istanbul ignore if */
  if (!previousResolvedFileEntry) {
    throw new InternalError(
      `Could not get previous resolved entry for ${filePath}`
    );
  }

  for (const [
    candidateFilePath,
    candidateFileDetails,
  ] of previousResolvedProjectInfo.files) {
    if (
      candidateFileDetails.fileType !== 'code' ||
      candidateFilePath === filePath
    ) {
      continue;
    }

    // Look for imports or the import side of reexports to see if they reference this file
    const doesCandidateImportFile = [
      ...candidateFileDetails.singleImports,
      ...candidateFileDetails.barrelImports,
      ...candidateFileDetails.dynamicImports,
      ...candidateFileDetails.singleReexports,
      ...candidateFileDetails.barrelReexports,
    ].some(
      (i) => 'resolvedModulePath' in i && i.resolvedModulePath === filePath
    );

    // If this file isn't a code file, then it can only be imported
    if (previousResolvedFileEntry.fileType === 'other') {
      if (doesCandidateImportFile) {
        fileReferences.push(candidateFilePath);
      }
      continue;
    }

    // Look for exports or the export side of reexports to see if this file references them
    const doesFileImportCandidate = [
      ...previousResolvedFileEntry.singleImports,
      ...previousResolvedFileEntry.barrelImports,
      ...previousResolvedFileEntry.dynamicImports,
      ...previousResolvedFileEntry.singleReexports,
      ...previousResolvedFileEntry.barrelReexports,
    ].some(
      (i) =>
        i.resolvedModuleType === 'firstPartyCode' &&
        i.resolvedModulePath === filePath
    );

    // If this file is a code file, we have to check both possibilities
    if (doesCandidateImportFile || doesFileImportCandidate) {
      fileReferences.push(candidateFilePath);
    }
  }

  return fileReferences;
}

function populateFileDetails(
  baseProjectInfo: BaseProjectInfo,
  filePath: string,
  baseCodeFileDetails: BaseCodeFileDetails,
  resolvedCodeFileDetails: ResolvedCodeFileDetails
) {
  // Resolve single imports
  for (const importDetails of baseCodeFileDetails.singleImports) {
    // Lack of a module specifier means this is a dynamic import with a
    // non-static, which we can't analyze, so we skip it
    if (!importDetails.moduleSpecifier) {
      continue;
    }
    const resolvedModuleSpecifier = resolveModuleSpecifier({
      baseProjectInfo,
      filePath,
      moduleSpecifier: importDetails.moduleSpecifier,
      isTypeImport: importDetails.isTypeImport,
    });
    resolvedCodeFileDetails.singleImports.push({
      ...importDetails,
      ...resolvedModuleSpecifier,
    });
  }

  // Resolve barrel imports
  for (const importDetails of baseCodeFileDetails.barrelImports) {
    // Lack of a module specifier means this is a dynamic import with a
    // non-static, which we can't analyze, so we skip it
    if (!importDetails.moduleSpecifier) {
      continue;
    }
    const resolvedModuleSpecifier = resolveModuleSpecifier({
      baseProjectInfo,
      filePath,
      moduleSpecifier: importDetails.moduleSpecifier,
      isTypeImport: false,
    });
    resolvedCodeFileDetails.barrelImports.push({
      ...importDetails,
      ...resolvedModuleSpecifier,
    });
  }

  // Resolve dynamic imports
  for (const importDetails of baseCodeFileDetails.dynamicImports) {
    // Lack of a module specifier means this is a dynamic import with a
    // non-static, which we can't analyze, so we skip it
    if (!importDetails.moduleSpecifier) {
      continue;
    }
    const resolvedModuleSpecifier = resolveModuleSpecifier({
      baseProjectInfo,
      filePath,
      moduleSpecifier: importDetails.moduleSpecifier,
      isTypeImport: false,
    });
    resolvedCodeFileDetails.dynamicImports.push({
      ...importDetails,
      ...resolvedModuleSpecifier,
    });
  }

  // Resolve single re-exports
  for (const reexportDetails of baseCodeFileDetails.singleReexports) {
    const resolvedModuleSpecifier = resolveModuleSpecifier({
      baseProjectInfo,
      filePath,
      moduleSpecifier: reexportDetails.moduleSpecifier,
      isTypeImport: reexportDetails.isTypeReexport,
    });
    resolvedCodeFileDetails.singleReexports.push({
      ...reexportDetails,
      ...resolvedModuleSpecifier,
    });
  }

  // Resolve barrel re-exports
  for (const reexportDetails of baseCodeFileDetails.barrelReexports) {
    const resolvedModuleSpecifier = resolveModuleSpecifier({
      baseProjectInfo,
      filePath,
      moduleSpecifier: reexportDetails.moduleSpecifier,
      isTypeImport: false,
    });
    resolvedCodeFileDetails.barrelReexports.push({
      ...reexportDetails,
      ...resolvedModuleSpecifier,
    });
  }

  // We don't need to do anything for resolved exports, but we _do_ want to
  // deep-ish clone each export's details
  for (const exportDetails of baseCodeFileDetails.exports) {
    resolvedCodeFileDetails.exports.push({
      ...exportDetails,
    });
  }
}

type FolderTreeNode = {
  folders: Record<string, FolderTreeNode>;
  // e.g `{ 'foo.ts': 1 }`, useful for quick lookups based on a complete filename
  files: Record<string, 1>;
  // e.g. `{ foo: ['.ts']}`, useful for determining ambiguous file extensions
  filesAndExtensions: Record<string, string[]>;
};

let folderTree: FolderTreeNode = {
  folders: {},
  files: {},
  filesAndExtensions: {},
};

const formattedBuiltinModules = builtinModules.filter(
  (m) => !m.startsWith('_')
);
for (let i = formattedBuiltinModules.length - 1; i >= 0; i--) {
  const builtinModule = formattedBuiltinModules[i];
  formattedBuiltinModules.push(`node:${builtinModule}`);
}

type ResolveModuleSpecifierOptions = {
  baseProjectInfo: BaseProjectInfo;
  filePath: string;
  moduleSpecifier: string;
  isTypeImport: boolean;
};

function resolveModuleSpecifier({
  baseProjectInfo,
  filePath,
  moduleSpecifier,
  isTypeImport,
}: ResolveModuleSpecifierOptions): Resolved {
  // First, check if this is a built-in module
  if (formattedBuiltinModules.includes(moduleSpecifier)) {
    return {
      resolvedModuleType: 'builtin',
    };
  }

  // This function takes in a bath that is "absolute" looking but relative to
  // rootDir, excluding the leading /
  function resolveFirstPartyImport(absolutishFilePath: string) {
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */

    // Check if this uses a Vite style import hints, and strip them out if so
    if (absolutishFilePath.includes('?')) {
      absolutishFilePath = absolutishFilePath.split('?')[0];
    }
    const segments = splitPathIntoSegments(absolutishFilePath);
    let lastSegment = segments.pop();
    const folderSegments = [...segments];
    /* istanbul ignore if */
    if (!lastSegment) {
      throw new InternalError(
        `lastSegment for ${absolutishFilePath} is undefined`
      );
    }

    let currentFolderTreeNode = folderTree;
    while (true) {
      const currentFolderSegment = segments.shift();
      if (!currentFolderSegment) {
        break;
      }
      currentFolderTreeNode =
        currentFolderTreeNode.folders[currentFolderSegment];

      // If there is no folder segment present, then that means this is an unresolved import
      if (!currentFolderTreeNode) {
        return undefined;
      }
    }

    function computeFilePath(file: string) {
      return join(baseProjectInfo.rootDir, ...folderSegments, file);
    }

    // First we check if this directly references a file + extension, and
    // shortcircuit, e.g.: `import { foo } from './foo.ts'` => 'foo.ts'
    if (currentFolderTreeNode.files[lastSegment]) {
      return computeFilePath(lastSegment);
    }

    // Check the special edge case of importing a file in TypeScript with
    // nodenext resolution, where the extension has `.js`, not `.ts`. To support
    // this edge case, we just strip off the .js since we support that anways
    if (lastSegment.endsWith('.js')) {
      lastSegment = lastSegment.slice(0, lastSegment.length - 3);
    }

    function findFileWithExtension(basename: string) {
      // Now we see if this references a file without an extension (the norm)
      const extensions = currentFolderTreeNode.filesAndExtensions[basename];
      if (!extensions) {
        return;
      }
      switch (extensions.length) {
        // Normally there's just one extension, so check this case first and return it
        case 1: {
          return computeFilePath(basename + extensions[0]);
        }

        // In the case of a vanilla JS file with a TS definition file, there will be two extensions
        case 2: {
          if (extensions.includes('.d.ts')) {
            if (isTypeImport) {
              return computeFilePath(basename + '.d.ts');
            } else if (extensions.includes('.js')) {
              return computeFilePath(basename + '.js');
            } else if (extensions.includes('.jsx')) {
              return computeFilePath(basename + '.jsx');
            }
          }
          // Intentionally fall through here, since we didn't find an expected
          // pair of files
        }

        // Otherwise we have multiple extensions in a non-paired configuration
        // eslint-disable-next-line no-fallthrough
        default: {
          // If there is only one code file, then we can resolve to that file,
          // since the only extensionless imports are for code files.
          let numCodeFiles = 0;
          let candidateExtension: string | undefined;
          for (const extension of extensions) {
            if (isCodeFile(computeFilePath(basename + extension))) {
              numCodeFiles++;
              candidateExtension = extension;
            }
          }
          if (numCodeFiles === 1 && candidateExtension) {
            return computeFilePath(basename + candidateExtension);
          }
          throw new Error(
            `Module specifier ${moduleSpecifier} in file ${filePath} is ambiguous because there is more than one file with this name`
          );
        }
      }
    }

    let computedFilePath = findFileWithExtension(lastSegment);
    if (computedFilePath) {
      return computedFilePath;
    }

    // Now we check if this references an index file, but only if a folder with
    // this segment exists
    currentFolderTreeNode = currentFolderTreeNode.folders[lastSegment];
    if (!currentFolderTreeNode) {
      return undefined;
    }
    folderSegments.push(lastSegment);

    computedFilePath = findFileWithExtension('index');
    if (computedFilePath) {
      return computedFilePath;
    }

    // If we got here, then we couldn't find a file entry
    return undefined;
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
  }

  function formatResolvedEntry(
    resolvedModulePath: string | undefined
  ): Resolved {
    if (!resolvedModulePath) {
      return {
        resolvedModuleType: 'firstPartyOther',
        resolvedModulePath: undefined,
      };
    }
    return {
      resolvedModuleType: isCodeFile(resolvedModulePath)
        ? 'firstPartyCode'
        : 'firstPartyOther',
      resolvedModulePath,
    };
  }

  const dirPath = dirname(filePath);

  // Check if this path is relative, which means its first party
  if (moduleSpecifier.startsWith('.')) {
    const resolvedPath = resolve(dirPath, moduleSpecifier);
    // We have to account for a very specific edge case. When a user does an
    // import with a specifier like `../..` such that the absolitish path
    // resolves to the root dir itself, then the standard absolitish path is
    // computed to be '' (empty string). In this case, the import may still be
    // valid though if there is an index file in the root door. We pre-apply
    // index in this case so that there are still path segments to resolve.
    const absolutish =
      resolvedPath === baseProjectInfo.rootDir
        ? 'index'
        : getRelativePathFromRoot(baseProjectInfo.rootDir, resolvedPath);
    const resolvedModulePath = resolveFirstPartyImport(absolutish);
    return formatResolvedEntry(resolvedModulePath);
  }

  // Check if this path starts with the a wildcard alias, which means its first party
  for (const [alias, path] of Object.entries(baseProjectInfo.wildcardAliases)) {
    if (moduleSpecifier.startsWith(alias)) {
      const absolutishPath = getRelativePathFromRoot(
        baseProjectInfo.rootDir,
        path
      );
      const resolvedModulePath = resolveFirstPartyImport(
        join(moduleSpecifier.replace(alias, absolutishPath))
      );
      return formatResolvedEntry(resolvedModulePath);
    }
  }

  // Check if this path is exactly a fixed alias, which means its first party
  for (const [alias, path] of Object.entries(baseProjectInfo.fixedAliases)) {
    if (moduleSpecifier === alias) {
      return formatResolvedEntry(path);
    }
  }

  // If we got here, then this is a third party import
  return {
    resolvedModuleType: 'thirdParty',
  };
}
