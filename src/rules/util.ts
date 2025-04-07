import { ESLintUtils } from '@typescript-eslint/utils';
import type { GenericContext } from '../types/context.js';
import { getFiles, isFileIgnored } from '../util/files.js';
import type { ParsedSettings } from '../settings/settings.js';
import { getSettings } from '../settings/settings.js';
import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
  updateCacheFromFileSystem,
} from '../module/module.js';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

const updateListeners = new Set<() => void>();
export function registerUpdateListener(cb: () => void) {
  updateListeners.add(cb);
}

export function getESMInfo(context: GenericContext) {
  const settings = getSettings(context);
  initializeProject(settings);

  // We have to call initializeProject first before we can check if this file
  // is ignored, because initializeProject initializes the ignore cache
  if (isFileIgnored(settings.rootDir, context.filename)) {
    return;
  }

  // If we're not in one-shot mode, update the cache, and if there were changes
  // call any esm change subscribers
  if (
    settings.mode !== 'one-shot' &&
    updateCacheForFile(
      context.filename,
      context.sourceCode.getText(),
      context.sourceCode.ast,
      settings
    )
  ) {
    for (const updateListener of updateListeners) {
      updateListener();
    }
  }

  const projectInfo = getProjectInfo();

  // Initialize file watching if we're in editor mode
  if (settings.mode === 'editor') {
    void initializeFileWatching(settings);
  }

  // Format and return the ESM info
  const fileInfo = projectInfo.files.get(context.filename);
  if (!fileInfo) {
    return;
  }
  return {
    fileInfo,
    projectInfo,
    settings,
  };
}

let fileWatchingInitialized = false;
async function initializeFileWatching(settings: ParsedSettings) {
  if (fileWatchingInitialized) {
    return;
  }
  fileWatchingInitialized = true;

  async function getUpdatedAtTimes() {
    const projectInfo = getProjectInfo();
    const files = await getFiles(projectInfo.rootDir, settings.ignorePatterns);
    return new Map(
      files.map(({ filePath, latestUpdatedAt }) => [filePath, latestUpdatedAt])
    );
  }

  let updatedAtTimes = await getUpdatedAtTimes();

  async function refresh() {
    try {
      const start = Date.now();
      const latestUpdatedTimes = await getUpdatedAtTimes();

      // First, find files that were deleted, represented by entries that are in
      // the previous list of modified times but are not in the new list
      const deleted: string[] = [];
      for (const [filePath] of updatedAtTimes) {
        if (!latestUpdatedTimes.has(filePath)) {
          deleted.push(filePath);
        }
      }

      // Now, find files that were added, represented by entries that are in
      // the new list of modified times but are not in the previous list
      const added: Array<{
        filePath: string;
        latestUpdatedAt: number;
      }> = [];
      for (const [filePath, latestUpdatedAt] of latestUpdatedTimes) {
        if (!updatedAtTimes.has(filePath)) {
          added.push({ filePath, latestUpdatedAt });
        }
      }

      // Finally, find files that were modified, represented by entries that are
      // in both the previous and new list of modified times but have different
      // last modified at times
      const modified: Array<{
        filePath: string;
        latestUpdatedAt: number;
      }> = [];
      for (const [filePath, latestUpdatedAt] of latestUpdatedTimes) {
        if (
          updatedAtTimes.has(filePath) &&
          updatedAtTimes.get(filePath) !== latestUpdatedAt
        ) {
          modified.push({ filePath, latestUpdatedAt });
        }
      }

      // Update the cache
      if (
        updateCacheFromFileSystem({ added, deleted, modified }, settings, start)
      ) {
        for (const updateListener of updateListeners) {
          updateListener();
        }
      }

      // Set up for the next refresh
      updatedAtTimes = latestUpdatedTimes;
    } finally {
      setTimeout(() => void refresh(), settings.editorUpdateRate);
    }
  }

  setTimeout(() => void refresh(), settings.editorUpdateRate);
}

export function isNonTestFile(filePath: string, rootDir: string) {
  // We want to ignore folders named __test__ outside of this project, in case
  // the entire project is itself a test (e.g. the unit tests for fast-import)
  const relativeFilePath = filePath.replace(`${rootDir}/`, '');
  return (
    !relativeFilePath.includes('.test.') &&
    !relativeFilePath.includes('__test__') &&
    !relativeFilePath.includes('__tests__')
  );
}
