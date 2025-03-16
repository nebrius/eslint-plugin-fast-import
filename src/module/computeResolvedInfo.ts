import type { BaseProjectInfo } from '../types/base';
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
  baseInfo: BaseProjectInfo
): ResolvedProjectInfo {
  computeFolderTree(baseInfo);

  const resolvedInfo: ResolvedProjectInfo = {
    ...baseInfo,
    files: {},
  };

  for (const [filePath, fileDetails] of Object.entries(baseInfo.files)) {
    if (fileDetails.fileType !== 'code') {
      resolvedInfo.files[filePath] = {
        fileType: 'other',
      };
      continue;
    }

    const resolvedFileInfo: ResolvedCodeFileDetails = {
      fileType: 'code',
      imports: [],
      exports: [],
      reexports: [],
    };
    resolvedInfo.files[filePath] = resolvedFileInfo;

    // Resolve imports
    for (const importDetails of fileDetails.imports) {
      // TODO: handle dynamic imports with non-static paths, represented by `moduleSpecifier` being undefined?
      if (!importDetails.moduleSpecifier) {
        continue;
      }
      const resolvedModuleSpecifier = resolveModuleSpecifier({
        baseInfo,
        filePath,
        moduleSpecifier: importDetails.moduleSpecifier,
        isTypeImport:
          importDetails.importType === 'single'
            ? importDetails.isTypeImport
            : false,
      });
      resolvedFileInfo.imports.push({
        ...importDetails,
        ...resolvedModuleSpecifier,
      });
    }

    // Resolve re-exports
    for (const reexportDetails of fileDetails.reexports) {
      const resolvedModuleSpecifier = resolveModuleSpecifier({
        baseInfo,
        filePath,
        moduleSpecifier: reexportDetails.moduleSpecifier,
        isTypeImport:
          reexportDetails.reexportType === 'single'
            ? reexportDetails.isTypeReexport
            : false,
      });
      resolvedFileInfo.reexports.push({
        ...reexportDetails,
        ...resolvedModuleSpecifier,
      });
    }

    // We don't need to do anything for resolved exports, but we _do_ want to deep-ish clone each export's details
    for (const exportDetails of fileDetails.exports) {
      resolvedFileInfo.exports.push({
        ...exportDetails,
      });
    }
  }
  return resolvedInfo;
}

type FolderTreeNode = {
  folders: Record<string, FolderTreeNode>;
  // e.g `{ 'foo.ts': 1, 'bar.tsx': 1}`, useful for quick lookups based on a complete filename
  files: Record<string, 1>;
  // e.g. `{ foo: ['.ts']}`, useful for determining ambiguous file extensions
  filesAndExtensions: Record<string, string[]>;
};

const folderTree: FolderTreeNode = {
  folders: {},
  files: {},
  filesAndExtensions: {},
};

let topLevelFolders: string[] = [];

function computeFolderTree(baseInfo: BaseProjectInfo) {
  for (const file of Object.keys(baseInfo.files)) {
    const folders = file.replace(baseInfo.sourceRoot + '/', '').split('/');
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
  baseInfo: BaseProjectInfo;
  filePath: string;
  moduleSpecifier: string;
  isTypeImport: boolean;
};

function resolveModuleSpecifier({
  baseInfo,
  filePath,
  moduleSpecifier,
  isTypeImport,
}: ResolveModuleSpecifierOptions): Resolved | undefined {
  // First, check if this is a built-in module
  if (formattedBuiltinModules.includes(moduleSpecifier)) {
    return {
      moduleType: 'builtin',
    };
  }

  // This function takes in a bath that is "absolute" but relative to sourceRoot, excluding the leading /
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
      return join(baseInfo.sourceRoot, folderSegments.join('/'), file);
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
      resolve(dirPath, moduleSpecifier).replace(baseInfo.sourceRoot + '/', '')
    );
    return formatResolvedEntry(resolvedModulePath);
  }

  // Check if this path starts with the root import alias, which means its first party
  if (
    baseInfo.rootImportAlias &&
    moduleSpecifier.startsWith(`${baseInfo.rootImportAlias}/`)
  ) {
    const resolvedModulePath = resolveFirstPartyImport(
      join(moduleSpecifier.replace(`${baseInfo.rootImportAlias}/`, ''))
    );
    return formatResolvedEntry(resolvedModulePath);
  }

  // If we allow aliasless root imports, check if this is one of them
  if (baseInfo.allowAliaslessRootImports) {
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
