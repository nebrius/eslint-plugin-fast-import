import type { Stats } from 'node:fs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import ignore from 'ignore';

type PotentialFile = {
  filePath: string;
  stats: Stats;
};

type IgnoreFile = {
  filePath: string;
  contents: string;
};

function buildFileList(
  potentialFiles: PotentialFile[],
  ignoreFiles: IgnoreFile[]
) {
  // Create the ignore instances for use in filtering
  const ignores = ignoreFiles.map((i) => ({
    dir: dirname(i.filePath),
    ig: ignore().add(i.contents),
  }));

  // Filter out ignored files
  const files: Array<{
    filePath: string;
    latestUpdatedAt: number;
  }> = [];
  outer: for (const { filePath, stats } of potentialFiles) {
    for (const { dir, ig } of ignores) {
      // Ignore file paths are relative to the directory the ignore file is in,
      // and needs files passed in to check to also be relative to that same
      // directory, so we get the relative path to the ignore file directory
      if (filePath.startsWith(dir) && ig.ignores(relative(dir, filePath))) {
        continue outer;
      }
    }
    files.push({
      filePath,
      latestUpdatedAt: stats.mtimeMs,
    });
  }

  return files;
}

let ignoreFiles: IgnoreFile[] | null = null;
function getIgnoreFiles(rootDir: string, potentialFiles: PotentialFile[]) {
  if (ignoreFiles) {
    return ignoreFiles;
  }

  // First, we need to traverse up the folder tree until we find the git root
  // folder. We're often operating in a project where `rootDir` is a `src`
  // folder, or even in a monorepo. In these cases, there is likely a gitignore
  // file(s) futher up the tree
  const extraIgnoreFiles: string[] = [];
  const rootDirContents = readdirSync(rootDir);
  if (!rootDirContents.includes('.git')) {
    let currentDir = dirname(rootDir);
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
  }

  // Normalize and read in all ignore file contents
  ignoreFiles = [
    ...extraIgnoreFiles,
    ...potentialFiles
      .filter(({ filePath }) => basename(filePath) === '.gitignore')
      .map(({ filePath }) => filePath),
  ].map((filePath) => ({
    filePath,
    contents: readFileSync(filePath, 'utf-8'),
  }));
  return ignoreFiles;
}

export function getFilesSync(rootDir: string) {
  // Read in the files and their stats, and filter out directories
  const potentialFiles = readdirSync(rootDir, {
    recursive: true,
    encoding: 'utf-8',
  })
    .map((f) => join(rootDir, f))
    // Stats will be used for multiple checks later, so we want to cache it now.
    // Unfortunately we need more than what {withFileTypes: true} provides, so
    // we still need to call statSync separately
    .map((filePath) => ({ filePath, stats: statSync(filePath) }))

    // Filter out any directories, so that this is only a file list
    .filter((f) => !f.stats.isDirectory());

  // Return the list of files
  return buildFileList(
    potentialFiles.filter(
      ({ filePath }) => basename(filePath) !== '.gitignore'
    ),
    getIgnoreFiles(rootDir, potentialFiles)
  );
}

export async function getFiles(rootDir: string) {
  // First, read in the files and convert the results to absolute path
  const potentialFilePaths = (
    await readdir(rootDir, {
      recursive: true,
      encoding: 'utf-8',
    })
  ).map((f) => join(rootDir, f));

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

  // Return the list of files
  return buildFileList(
    potentialFiles.filter(
      ({ filePath }) => basename(filePath) !== '.gitignore'
    ),

    // Although this is synchronous, we'll always get the cached copy since the
    // synchronous version of getFiles is always called first and will populate
    // the cache for us
    getIgnoreFiles(rootDir, potentialFiles)
  );
}
