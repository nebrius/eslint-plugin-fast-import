import type { Stats } from 'node:fs';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';

import type { Ignore } from 'ignore';
import ignore from 'ignore';

import type { IgnorePattern } from '../settings/settings.js';
import { InternalError } from './error.js';
import { warn } from './logging.js';

type PotentialFile = {
  filePath: string;
  stats: Stats;
};

export function getFilesSync(rootDir: string, ignorePatterns: IgnorePattern[]) {
  // Read in the files and their stats, and filter out directories
  const potentialFiles = getPotentialFilesList(rootDir)
    // Stats will be used for multiple checks later, so we want to cache it now.
    // Unfortunately we need more than what {withFileTypes: true} provides, so
    // we still need to call statSync separately
    .map((filePath) => ({ filePath, stats: statSync(filePath) }))

    // Filter out any directories, so that this is only a file list
    .filter((f) => !f.stats.isDirectory());

  // Find all package.json files between rootDir and the file system root, since
  // Node.js will always look this far for dependencies
  const parentPackageJsons: string[] = [];
  let currentDir = rootDir;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const dirContents = readdirSync(currentDir);
    if (dirContents.includes('package.json')) {
      parentPackageJsons.push(join(currentDir, 'package.json'));
    }
    const nextDir = dirname(currentDir);
    if (nextDir === currentDir) {
      break;
    }
    currentDir = nextDir;
  }

  // Return the list of files
  return buildFileList(
    rootDir,
    parentPackageJsons,
    ignorePatterns,
    potentialFiles.filter(({ filePath }) => basename(filePath) !== '.gitignore')
  );
}

export async function getFiles(
  rootDir: string,
  ignorePatterns: IgnorePattern[]
) {
  // First, read in the files and convert the results to absolute path
  const potentialFilePaths = getPotentialFilesList(rootDir);

  // Now add the stats to each file
  const potentialFiles = (
    await Promise.all(
      potentialFilePaths.map(async (filePath) => {
        const stats = await stat(filePath);
        return { filePath, stats };
      })
    )
  )
    // Filter out any directories, so that this is only a file list
    .filter((f) => !f.stats.isDirectory());

  const parentPackageJsons: string[] = [];
  let currentDir = rootDir;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const dirContents = await readdir(currentDir);
    if (dirContents.includes('package.json')) {
      parentPackageJsons.push(join(currentDir, 'package.json'));
    }
    const nextDir = dirname(currentDir);
    if (nextDir === currentDir) {
      break;
    }
    currentDir = nextDir;
  }

  // Return the list of files
  return buildFileList(
    rootDir,
    parentPackageJsons,
    ignorePatterns,
    potentialFiles.filter(
      ({ filePath }) =>
        !filePath.includes('node_modules') &&
        !filePath.includes(sep + '.git' + sep) &&
        basename(filePath) !== '.gitignore'
    )
  );
}

const WINDOWS_ABSOLUTE_PATH_REGEX = /^[A-Z]:\\/;
export function convertToUnixishPath(path: string) {
  if (path.includes('/') && path.includes('\\')) {
    throw new InternalError(`Path ${path} contains both / and \\`);
  }
  if (WINDOWS_ABSOLUTE_PATH_REGEX.test(path)) {
    path = path.substring(2);
  }
  if (path.includes('\\')) {
    return path.replaceAll('\\', '/');
  }
  return path;
}

export function trimTrailingPathSeparator(path: string) {
  if (path.endsWith('/')) {
    return path.slice(0, -1);
  } else if (path.endsWith('\\')) {
    return path.slice(0, -1);
  }
  return path;
}

export function splitPathIntoSegments(path: string) {
  return convertToUnixishPath(path)
    .split('/')
    .filter((s) => s);
}

export function getRelativePathFromRoot(rootDir: string, filePath: string) {
  const relativePath = filePath.replace(rootDir, '');
  if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
    return relativePath.substring(1);
  }
  return relativePath;
}

let ignores: Array<{ dir: string; ig: Ignore }> | null = null;
const ignoreCache = new Map<string, boolean>();
export function isFileIgnored(rootDir: string, filePath: string) {
  /* istanbul ignore if */
  if (!ignores) {
    throw new InternalError(`isFileIgnored called before ignores initialized`);
  }
  if (!filePath.startsWith(rootDir)) {
    return true;
  }

  // Get the file from the cache, if it's already cached
  const fileCacheResult = ignoreCache.get(filePath);
  if (typeof fileCacheResult === 'boolean') {
    return fileCacheResult;
  }

  // Otherwise compare with ignore
  for (const { dir, ig } of ignores) {
    // Ignore file paths are relative to the directory the ignore file is in,
    // and needs files passed in to check to also be relative to that same
    // directory, so we get the relative path to the ignore file directory
    if (filePath.startsWith(dir) && ig.ignores(relative(dir, filePath))) {
      ignoreCache.set(filePath, true);
      return true;
    }
  }
  ignoreCache.set(filePath, false);
  return false;
}

// eslint-disable-next-line fast-import/no-unused-exports
export function _reset() {
  ignores = null;
}

export function getDependenciesFromPackageJson(packageJsonPath: string) {
  const packageJsonContents = readFileSync(packageJsonPath, 'utf-8');
  const parsedPackageJson = JSON.parse(packageJsonContents) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    workspaces?: string[];
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

  // Find workspaces here
  if (parsedPackageJson.workspaces) {
    for (const workspace of parsedPackageJson.workspaces) {
      if (workspace.includes('*')) {
        warn(`Glob workspaces are not supported, and will be ignored`);
        continue;
      }
      const workspacePackageJsonPath = join(
        dirname(packageJsonPath),
        workspace,
        'package.json'
      );
      if (!existsSync(workspacePackageJsonPath)) {
        throw new Error(
          `Workspace package.json not found at "${workspacePackageJsonPath}"`
        );
      }
      const workspacePackageJson = JSON.parse(
        readFileSync(workspacePackageJsonPath, 'utf-8')
      ) as { name: string };
      dependencies.push(workspacePackageJson.name);
    }
  }

  return dependencies;
}

// Get a potential list of files, automatically filtering out a few directories
// known to contain lots of files we always want to ignore early on for perf
// reasons. Waiting to check against ignores incurs a big perf hit due to the
// more complex and Regex based logic of ignores.
function getPotentialFilesList(rootDir: string): string[] {
  const potentialFilesList: string[] = [];

  const dirContents = readdirSync(rootDir, {
    withFileTypes: true,
  });

  for (const content of dirContents) {
    if (!content.isDirectory()) {
      potentialFilesList.push(join(rootDir, content.name));
    } else if (
      content.name !== 'node_modules' &&
      content.name !== 'dist' &&
      content.name !== 'build' &&
      content.name !== '.git'
    ) {
      potentialFilesList.push(
        ...getPotentialFilesList(join(rootDir, content.name))
      );
    }
  }

  return potentialFilesList;
}

function buildFileList(
  rootDir: string,
  parentPackageJsons: string[],
  ignorePatterns: IgnorePattern[],
  potentialFiles: PotentialFile[]
) {
  // Create the ignore instances for use in filtering
  initializeIgnores(rootDir, ignorePatterns, potentialFiles);

  // Filter out ignored files
  const files: Array<{
    filePath: string;
    latestUpdatedAt: number;
  }> = [];
  const packageJsons: string[] = [...parentPackageJsons];
  for (const { filePath, stats } of potentialFiles) {
    if (basename(filePath) === 'package.json') {
      packageJsons.push(filePath);
    }
    if (isFileIgnored(rootDir, filePath)) {
      continue;
    }
    files.push({
      filePath,
      latestUpdatedAt: stats.mtimeMs,
    });
  }

  return { files, packageJsons };
}

function initializeIgnores(
  rootDir: string,
  ignorePatterns: IgnorePattern[],
  potentialFiles: PotentialFile[]
) {
  if (ignores) {
    return;
  }

  // First, we need to traverse up the folder tree until we find the git root
  // folder. We're often operating in a project where `rootDir` is a `src`
  // folder, or even in a monorepo. In these cases, there is likely a gitignore
  // file(s) futher up the tree
  const extraIgnoreFiles: string[] = [];
  let currentDir = rootDir;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const currentDirContents = readdirSync(currentDir);
    if (currentDirContents.includes('.gitignore')) {
      extraIgnoreFiles.push(join(currentDir, '.gitignore'));
    }
    if (
      // If we found the git folder, bail
      currentDirContents.includes('.git') ||
      // If we're at the root folder of the file system, bail. Note: we do the
      // check this way to support both UNIX and Windows filesystems
      currentDir === dirname(rootDir)
    ) {
      break;
    }
    currentDir = dirname(rootDir);
  }

  // Normalize and read in all ignore file contents
  const ignoreFiles = [
    ...extraIgnoreFiles,
    ...potentialFiles
      .filter(({ filePath }) => basename(filePath) === '.gitignore')
      .map(({ filePath }) => filePath),
  ].map((filePath) => ({
    filePath,
    contents: readFileSync(filePath, 'utf-8'),
  }));

  ignores = [
    ...ignorePatterns.map((i) => ({
      dir: i.dir,
      ig: ignore().add(i.contents),
    })),
    ...ignoreFiles.map((i) => ({
      dir: dirname(i.filePath),
      ig: ignore().add(i.contents),
    })),
  ];
}
