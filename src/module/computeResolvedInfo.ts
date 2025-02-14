import type { BaseProjectInfo } from '../types/base';
import type {
  Resolved,
  ResolvedCodeFileDetails,
  ResolvedProjectInfo,
} from '../types/resolved';
import { InternalError } from '../util/error';
import { builtinModules } from 'node:module';
import { dirname, join, resolve } from 'node:path';
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
    if (fileDetails.type !== 'esm') {
      continue;
    }

    const resolvedFileInfo: ResolvedCodeFileDetails = {
      type: 'esm',
      imports: [],
      exports: [],
      reexports: [],
    };
    resolvedInfo.files[filePath] = resolvedFileInfo;

    // Resolve imports
    for (const importDetails of fileDetails.imports) {
      // TODO: handle dynamic imports with non-static paths, represented by `moduleSpecifier` being undefined
      if (!importDetails.moduleSpecifier) {
        continue;
      }
      const resolvedModuleSpecifier = resolveModuleSpecifier(
        baseInfo,
        filePath,
        importDetails.moduleSpecifier
      );
      resolvedFileInfo.imports.push({
        ...importDetails,
        ...resolvedModuleSpecifier,
      });
    }

    // Resolve re-exports
    for (const reexportDetails of fileDetails.reexports) {
      const resolvedModuleSpecifier = resolveModuleSpecifier(
        baseInfo,
        filePath,
        reexportDetails.moduleSpecifier
      );
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
  files: Record<string, 1>;
};

const folderTree: FolderTreeNode = {
  folders: {},
  files: {},
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
        };
      }
      currentFolderTreeNode = currentFolderTreeNode.folders[currentFolder];
    }

    currentFolderTreeNode.files[basefile] = 1;
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

function resolveModuleSpecifier(
  baseInfo: BaseProjectInfo,
  filePath: string,
  moduleSpecifier: string
): Resolved | undefined {
  // First, check if this is a built-in module
  if (formattedBuiltinModules.includes(moduleSpecifier)) {
    return {
      moduleType: 'builtin',
    };
  }

  function resolveFirstPartyImport(absolutishFilePath: string) {
    // TODO
    console.log(absolutishFilePath);
    return '';
  }

  const dirPath = dirname(filePath);

  // Check if this path is relative, which means its first party
  if (moduleSpecifier.startsWith('.')) {
    const resolvedModulePath = resolveFirstPartyImport(
      resolve(dirPath, moduleSpecifier).replace(baseInfo.sourceRoot + '/', '')
    );
    return {
      moduleType: isCodeFile(resolvedModulePath)
        ? 'firstPartyCode'
        : 'firstPartyOther',
      resolvedModulePath,
    };
  }

  // Check if this path starts with the root import alias, which means its first party
  if (
    baseInfo.rootImportAlias &&
    moduleSpecifier.startsWith(`${baseInfo.rootImportAlias}/`)
  ) {
    const resolvedModulePath = resolveFirstPartyImport(
      join(
        baseInfo.sourceRoot,
        moduleSpecifier.replace(`${baseInfo.rootImportAlias}/`, '')
      )
    );
    return {
      moduleType: isCodeFile(resolvedModulePath)
        ? 'firstPartyCode'
        : 'firstPartyOther',
      resolvedModulePath,
    };
  }

  // If we allow aliasless root imports, check if this is one of them
  if (baseInfo.allowAliaslessRootImports) {
    const firstSegment = moduleSpecifier.split('/')[0];
    if (topLevelFolders.includes(firstSegment)) {
      const resolvedModulePath = resolveFirstPartyImport(moduleSpecifier);
      return {
        moduleType: isCodeFile(resolvedModulePath)
          ? 'firstPartyCode'
          : 'firstPartyOther',
        resolvedModulePath,
      };
    }
  }

  // If we got here, then this is a third party import
  return {
    moduleType: 'thirdParty',
  };
}
