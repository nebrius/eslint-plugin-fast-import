import type { Stats } from 'node:fs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';

import type { Ignore } from 'ignore';
import ignore from 'ignore';

import type { IgnorePattern } from '../settings/settings.js';
import { InternalError } from './error.js';

type PotentialFile = {
  filePath: string;
  stats: Stats;
};

const DEFAULT_IGNORE_DIRECTORIES = ['node_modules', 'dist', 'build', '.git'];

export function isDefaultIgnoredPath(path: string) {
  return DEFAULT_IGNORE_DIRECTORIES.some(
    (dir) => path.includes(sep + dir + sep) || path.endsWith(sep + dir)
  );
}

// Fetch a list of all fast-import.config.json files, which correspond to each
// package that we want to analyze in a monorepo. We use our own recursive
// implementation instead of a library like glob to avoid recusring into folders
// that are a) very large and b) guaranteed to not be analyzed.
export function getMonorepoPackageSettings(packageRootDir: string): string[] {
  const packages: string[] = [];
  const directoryStack = [packageRootDir];
  while (directoryStack.length) {
    const currentDir = directoryStack.pop();
    if (!currentDir) {
      break;
    }
    if (DEFAULT_IGNORE_DIRECTORIES.includes(basename(currentDir))) {
      continue;
    }
    const directoryContents = readdirSync(currentDir, { withFileTypes: true });
    const hasConfigFile = directoryContents.some((item) => item.name === 'fast-import.config.json');
    if (hasConfigFile) {
      packages.push(join(currentDir, 'fast-import.config.json'));
    } else {
      // Only continue recursing if we didn't find a config file, since we don't
      // support nested config files by design
      for (const item of directoryContents) {
        if (item.isDirectory()) {
          directoryStack.push(join(currentDir, item.name));
        }
      }
    }
  }
  return packages;
}

export function getFilesSync(
  packageRootDir: string,
  ignorePatterns: IgnorePattern[],
  ignoreOverridePatterns: IgnorePattern[]
) {
  // Read in the files and their stats, and filter out directories
  const potentialFiles = getPotentialFilesList(packageRootDir)
    // Stats will be used for multiple checks later, so we want to cache it now.
    // Unfortunately we need more than what {withFileTypes: true} provides, so
    // we still need to call statSync separately
    .map((filePath) => ({ filePath, stats: statSync(filePath) }))

    // Filter out any directories, so that this is only a file list
    .filter((f) => !f.stats.isDirectory());

  // Find all package.json files between packageRootDir and the file system root, since
  // Node.js will always look this far for dependencies
  const parentPackageJsons: string[] = [];
  let currentDir = packageRootDir;
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
    packageRootDir,
    parentPackageJsons,
    ignorePatterns,
    ignoreOverridePatterns,
    potentialFiles.filter(({ filePath }) => basename(filePath) !== '.gitignore')
  );
}

export async function getFiles(
  packageRootDir: string,
  ignorePatterns: IgnorePattern[],
  ignoreOverridePatterns: IgnorePattern[]
) {
  // First, read in the files and convert the results to absolute path
  const potentialFilePaths = getPotentialFilesList(packageRootDir);

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
  let currentDir = packageRootDir;
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
    packageRootDir,
    parentPackageJsons,
    ignorePatterns,
    ignoreOverridePatterns,
    potentialFiles.filter(
      ({ filePath }) => !isDefaultIgnoredPath(filePath) && basename(filePath) !== '.gitignore'
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

export function getRelativePathFromRoot(packageRootDir: string, filePath: string) {
  const relativePath = filePath.replace(packageRootDir, '');
  if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
    return relativePath.substring(1);
  }
  return relativePath;
}

type IgnoreData = {
  cache: Map<string, boolean>;
  ignores: Array<{ dir: string; ig: Ignore }>;
  overrides: Array<{ dir: string; ig: Ignore }>;
};

// Map from packageRootDir to ignore data
const ignoreData = new Map<string, IgnoreData>();
export function isFileIgnored(packageRootDir: string, filePath: string) {
  const data = ignoreData.get(packageRootDir);
  if (!data) {
    return true;
  }

  // Get the file from the cache, if it's already cached
  const fileCacheResult = data.cache.get(filePath);
  if (typeof fileCacheResult === 'boolean') {
    return fileCacheResult;
  }

  // Check override patterns first - if matched, file is NOT ignored
  for (const { dir, ig } of data.overrides) {
    if (filePath.startsWith(dir) && ig.ignores(relative(dir, filePath))) {
      data.cache.set(filePath, false);
      return false;
    }
  }

  // Check ignore patterns
  for (const { dir, ig } of data.ignores) {
    // Ignore file paths are relative to the directory the ignore file is in,
    // and needs files passed in to check to also be relative to that same
    // directory, so we get the relative path to the ignore file directory
    if (filePath.startsWith(dir) && ig.ignores(relative(dir, filePath))) {
      data.cache.set(filePath, true);
      return true;
    }
  }
  data.cache.set(filePath, false);
  return false;
}

// eslint-disable-next-line fast-import/no-unused-exports
export function _reset() {
  ignoreData.clear();
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

  return dependencies;
}

// Get a potential list of files, automatically filtering out a few directories
// known to contain lots of files we always want to ignore early on for perf
// reasons. Waiting to check against ignores incurs a big perf hit due to the
// more complex and Regex based logic of ignores.
function getPotentialFilesList(packageRootDir: string): string[] {
  const potentialFilesList: string[] = [];

  const dirContents = readdirSync(packageRootDir, {
    withFileTypes: true,
  });

  for (const content of dirContents) {
    if (!content.isDirectory()) {
      potentialFilesList.push(join(packageRootDir, content.name));
    } else if (!DEFAULT_IGNORE_DIRECTORIES.includes(content.name)) {
      potentialFilesList.push(...getPotentialFilesList(join(packageRootDir, content.name)));
    }
  }

  return potentialFilesList;
}

function buildFileList(
  packageRootDir: string,
  parentPackageJsons: string[],
  ignorePatterns: IgnorePattern[],
  ignoreOverridePatterns: IgnorePattern[],
  potentialFiles: PotentialFile[]
) {
  // Create the ignore instances for use in filtering
  initializeIgnores(packageRootDir, ignorePatterns, ignoreOverridePatterns, potentialFiles);

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
    if (isFileIgnored(packageRootDir, filePath)) {
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
  packageRootDir: string,
  ignorePatterns: IgnorePattern[],
  ignoreOverridePatterns: IgnorePattern[],
  potentialFiles: PotentialFile[]
) {
  if (ignoreData.has(packageRootDir)) {
    return;
  }

  // First, we need to traverse up the folder tree until we find the git root
  // folder. We're often operating in a project where `packageRootDir` is a `src`
  // folder, or even in a monorepo. In these cases, there is likely a gitignore
  // file(s) futher up the tree
  const extraIgnoreFiles: string[] = [];
  let currentDir = packageRootDir;
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
      currentDir === dirname(packageRootDir)
    ) {
      break;
    }
    currentDir = dirname(packageRootDir);
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

  ignoreData.set(packageRootDir, {
    ignores: [
      ...ignorePatterns.map((i) => ({
        dir: i.dir,
        ig: ignore().add(i.contents),
      })),
      ...ignoreFiles.map((i) => ({
        dir: dirname(i.filePath),
        ig: ignore().add(i.contents),
      })),
    ],
    overrides: ignoreOverridePatterns.map((i) => ({
      dir: i.dir,
      ig: ignore().add(i.contents),
    })),
    cache: new Map<string, boolean>(),
  });
}
