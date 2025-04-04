import { readdirSync, statSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

// TODO: filter out ignored files here
export function getFilesSync(rootDir: string) {
  const potentialFiles = readdirSync(rootDir, {
    recursive: true,
    encoding: 'utf-8',
  });

  const files: Array<{
    filePath: string;
    latestUpdatedAt: number;
  }> = [];
  for (const potentialFilePath of potentialFiles) {
    const filePath = join(rootDir, potentialFilePath);
    const stats = statSync(filePath);
    if (!stats.isDirectory()) {
      files.push({
        filePath,
        latestUpdatedAt: stats.mtimeMs,
      });
    }
  }

  return files;
}

// TODO: filter out ignored files here
export async function getFiles(rootDir: string) {
  const potentialFiles = await readdir(rootDir, {
    recursive: true,
    encoding: 'utf-8',
  });

  const files: Array<{
    filePath: string;
    latestUpdatedAt: number;
  }> = [];
  await Promise.all(
    potentialFiles.map(async (potentialFilePath) => {
      const filePath = join(rootDir, potentialFilePath);
      const stats = await stat(filePath);
      if (!stats.isDirectory()) {
        files.push({ filePath, latestUpdatedAt: stats.mtimeMs });
      }
    })
  );

  return files;
}
