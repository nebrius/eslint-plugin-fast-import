import type { BaseCodeFileDetails, BaseProjectInfo } from '../types/base';
import type {
  Resolved,
  ResolvedCodeFileDetails,
  ResolvedProjectInfo,
} from '../types/resolved';
import { InternalError } from '../util/error';
import { builtinModules } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { isCodeFile } from '../util/code';

export function computeResolvedInfo(
  baseProjectInfo: BaseProjectInfo
): ResolvedProjectInfo {
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
      imports: [],
      exports: [],
      reexports: [],
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
  computeFolderTree(newBaseProjectInfo);

  const baseFileInfo = newBaseProjectInfo.files.get(filePath);
  if (!baseFileInfo) {
    throw new InternalError(`Could not get base file info for ${filePath}`);
  }
  if (isCodeFile(filePath)) {
    if (baseFileInfo.fileType !== 'code') {
      throw new InternalError(`Mismatched file types for ${filePath}`);
    }
    const resolvedCodeFileDetails: ResolvedCodeFileDetails = {
      fileType: 'code',
      imports: [],
      exports: [],
      reexports: [],
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

function getFileReferences(
  previousResolvedProjectInfo: ResolvedProjectInfo,
  filePath: string
) {
  const fileReferences = [];
  for (const [
    candidateFilePath,
    candidateFileDetails,
  ] of previousResolvedProjectInfo.files) {
    if (candidateFileDetails.fileType !== 'code') {
      continue;
    }
    if (
      candidateFileDetails.imports.some(
        (i) => 'resolvedModulePath' in i && i.resolvedModulePath === filePath
      ) ||
      candidateFileDetails.reexports.some(
        (r) => 'resolvedModulePath' in r && r.resolvedModulePath === filePath
      )
    ) {
      fileReferences.push(candidateFilePath);
    }
  }
  return fileReferences;
}

export function updateResolvedInfoForFile(
  filePath: string,
  newBaseProjectInfo: BaseProjectInfo,
  previousResolvedProjectInfo: ResolvedProjectInfo
) {
  const baseFileInfo = newBaseProjectInfo.files.get(filePath);
  if (!baseFileInfo) {
    throw new InternalError(`Could not get base file info for ${filePath}`);
  }
  if (baseFileInfo.fileType !== 'code') {
    throw new InternalError(`Mismatched file types for ${filePath}`);
  }

  const filePathsToUpdate = [
    filePath,
    ...getFileReferences(previousResolvedProjectInfo, filePath),
  ];
  for (const filePathToUpdate of filePathsToUpdate) {
    const resolvedCodeFileDetails: ResolvedCodeFileDetails = {
      fileType: 'code',
      imports: [],
      exports: [],
      reexports: [],
    };
    previousResolvedProjectInfo.files.set(
      filePathToUpdate,
      resolvedCodeFileDetails
    );
    populateFileDetails(
      newBaseProjectInfo,
      filePathToUpdate,
      baseFileInfo,
      resolvedCodeFileDetails
    );
  }
}

// TODO: wire in deletions to in-editor file watcher once it's implemented
// eslint-disable-next-line fast-esm/no-unused-exports
export function deleteResolvedInfoForFile(
  filePath: string,
  newBaseProjectInfo: BaseProjectInfo,
  previousResolvedProjectInfo: ResolvedProjectInfo
) {
  const baseFileInfo = newBaseProjectInfo.files.get(filePath);
  if (!baseFileInfo) {
    throw new InternalError(`Could not get base file info for ${filePath}`);
  }
  if (baseFileInfo.fileType !== 'code') {
    throw new InternalError(`Mismatched file types for ${filePath}`);
  }
  const filePathsToUpdate = getFileReferences(
    previousResolvedProjectInfo,
    filePath
  );
  previousResolvedProjectInfo.files.delete(filePath);
  for (const filePathToUpdate of filePathsToUpdate) {
    const resolvedCodeFileDetails: ResolvedCodeFileDetails = {
      fileType: 'code',
      imports: [],
      exports: [],
      reexports: [],
    };
    previousResolvedProjectInfo.files.set(
      filePathToUpdate,
      resolvedCodeFileDetails
    );
    populateFileDetails(
      newBaseProjectInfo,
      filePathToUpdate,
      baseFileInfo,
      resolvedCodeFileDetails
    );
  }
}

function populateFileDetails(
  baseProjectInfo: BaseProjectInfo,
  filePath: string,
  baseCodeFileDetails: BaseCodeFileDetails,
  resolvedCodeFileDetails: ResolvedCodeFileDetails
) {
  // Resolve imports
  for (const importDetails of baseCodeFileDetails.imports) {
    // TODO: handle dynamic imports with non-static paths, represented by `moduleSpecifier` being undefined?
    if (!importDetails.moduleSpecifier) {
      continue;
    }
    const resolvedModuleSpecifier = resolveModuleSpecifier({
      baseProjectInfo,
      filePath,
      moduleSpecifier: importDetails.moduleSpecifier,
      isTypeImport:
        importDetails.importType === 'single'
          ? importDetails.isTypeImport
          : false,
    });
    resolvedCodeFileDetails.imports.push({
      ...importDetails,
      ...resolvedModuleSpecifier,
    });
  }

  // Resolve re-exports
  for (const reexportDetails of baseCodeFileDetails.reexports) {
    const resolvedModuleSpecifier = resolveModuleSpecifier({
      baseProjectInfo,
      filePath,
      moduleSpecifier: reexportDetails.moduleSpecifier,
      isTypeImport:
        reexportDetails.reexportType === 'single'
          ? reexportDetails.isTypeReexport
          : false,
    });
    resolvedCodeFileDetails.reexports.push({
      ...reexportDetails,
      ...resolvedModuleSpecifier,
    });
  }

  // We don't need to do anything for resolved exports, but we _do_ want to deep-ish clone each export's details
  for (const exportDetails of baseCodeFileDetails.exports) {
    resolvedCodeFileDetails.exports.push({
      ...exportDetails,
    });
  }
}

type FolderTreeNode = {
  folders: Record<string, FolderTreeNode>;
  // e.g `{ 'foo.ts': 1, 'bar.tsx': 1}`, useful for quick lookups based on a complete filename
  files: Record<string, 1>;
  // e.g. `{ foo: ['.ts']}`, useful for determining ambiguous file extensions
  filesAndExtensions: Record<string, string[]>;
};

let folderTree: FolderTreeNode = {
  folders: {},
  files: {},
  filesAndExtensions: {},
};

let topLevelFolders: string[] = [];

function computeFolderTree(baseInfo: BaseProjectInfo) {
  // Reset the cache before we start
  folderTree = {
    folders: {},
    files: {},
    filesAndExtensions: {},
  };
  for (const [file] of baseInfo.files) {
    const folders = file.replace(baseInfo.rootDir + '/', '').split('/');
    const basefile = folders.pop();
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

  topLevelFolders = Object.keys(folderTree.folders);
}

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
      moduleType: 'builtin',
    };
  }

  // This function takes in a bath that is "absolute" but relative to rootDir, excluding the leading /
  function resolveFirstPartyImport(absolutishFilePath: string) {
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
    const segments = absolutishFilePath.split('/');
    const lastSegment = segments.pop();
    const folderSegments = [...segments];
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

      // If there is no folder segment present, then that means this is a missing import

      if (!currentFolderTreeNode) {
        return undefined;
      }
    }

    function computeFilePath(file: string) {
      return join(baseProjectInfo.rootDir, folderSegments.join('/'), file);
    }

    // First we check if this directly references a file + extension, and shortcircuit, e.g.:
    // `import { foo } from './foo.ts'` => 'foo.ts'
    if (currentFolderTreeNode.files[lastSegment]) {
      return computeFilePath(lastSegment);
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
          // Intentionally fall through here, since we didn't find an expected pair of files
        }

        // Otherwise the import is ambiguous and we can't determine which file it references
        default: {
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

    // Now we check if this references an index file, but only if a folder with this segment exists
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
        moduleType: 'firstPartyOther',
        resolvedModulePath: undefined,
      };
    }
    return {
      moduleType: isCodeFile(resolvedModulePath)
        ? 'firstPartyCode'
        : 'firstPartyOther',
      resolvedModulePath,
    };
  }

  const dirPath = dirname(filePath);

  // Check if this path is relative, which means its first party
  if (moduleSpecifier.startsWith('.')) {
    const resolvedModulePath = resolveFirstPartyImport(
      resolve(dirPath, moduleSpecifier).replace(
        baseProjectInfo.rootDir + '/',
        ''
      )
    );
    return formatResolvedEntry(resolvedModulePath);
  }

  // Check if this path starts with the root import alias, which means its first party
  for (const [alias, path] of Object.entries(baseProjectInfo.alias)) {
    if (moduleSpecifier.startsWith(`${alias}/`)) {
      const resolvedModulePath = resolveFirstPartyImport(
        join(moduleSpecifier.replace(`${alias}/`, path).replace('./', ''))
      );
      return formatResolvedEntry(resolvedModulePath);
    }
  }

  // If we allow aliasless root imports, check if this is one of them
  if (baseProjectInfo.allowAliaslessRootImports) {
    const firstSegment = moduleSpecifier.split('/')[0];
    if (topLevelFolders.includes(firstSegment)) {
      const resolvedModulePath = resolveFirstPartyImport(moduleSpecifier);
      return formatResolvedEntry(resolvedModulePath);
    }
  }

  // If we got here, then this is a third party import
  return {
    moduleType: 'thirdParty',
  };
}
