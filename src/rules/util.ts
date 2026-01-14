import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
  updateCacheFromFileSystem,
} from '../module/module.js';
import type { ParsedSettings } from '../settings/settings.js';
import { getSettings, markSettingsForRefresh } from '../settings/settings.js';
import type { GenericContext } from '../types/context.js';
import {
  getFiles,
  getRelativePathFromRoot,
  isFileIgnored,
} from '../util/files.js';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/eslint-plugin-fast-import/tree/main/src/rules/${name}/README.md`
);

const updateListeners = new Set<(rootDir: string) => void>();
export function registerUpdateListener(cb: (rootDir: string) => void) {
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
      updateListener(settings.rootDir);
    }
  }

  const projectInfo = getProjectInfo(settings.rootDir);

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

export function getLocFromRange(
  context: GenericContext,
  range: TSESTree.Node['range']
): TSESTree.Node['loc'] {
  const start = context.sourceCode.getLocFromIndex(range[0]);
  const end = context.sourceCode.getLocFromIndex(range[1]);
  return { start, end };
}

const fileWatchingInitialized = new Set<string>();
// This code is too dynamic w.r.t. the filesystem to effectively test
/* istanbul ignore next*/
async function initializeFileWatching(settings: ParsedSettings) {
  if (fileWatchingInitialized.has(settings.rootDir)) {
    return;
  }
  fileWatchingInitialized.add(settings.rootDir);

  async function getUpdatedAtTimes() {
    const projectInfo = getProjectInfo(settings.rootDir);
    const { files, packageJsons } = await getFiles(
      projectInfo.rootDir,
      settings.ignorePatterns,
      settings.ignoreOverridePatterns
    );
    return {
      files: new Map(
        files.map(({ filePath, latestUpdatedAt }) => [
          filePath,
          latestUpdatedAt,
        ])
      ),
      packageJsons,
    };
  }

  let updatedAtTimes = await getUpdatedAtTimes();

  async function refresh() {
    try {
      // Reset settings in case package.json, tsconfig.json, eslint.config.js,
      // or other files that control users settings have changed
      markSettingsForRefresh(settings.rootDir);
      const start = performance.now();
      const latestUpdatedTimes = await getUpdatedAtTimes();

      // First, find files that were deleted, represented by entries that are in
      // the previous list of modified times but are not in the new list
      const deleted: string[] = [];
      for (const [filePath] of updatedAtTimes.files) {
        if (!latestUpdatedTimes.files.has(filePath)) {
          deleted.push(filePath);
        }
      }

      // Now, find files that were added, represented by entries that are in
      // the new list of modified times but are not in the previous list
      const added: Array<{
        filePath: string;
        latestUpdatedAt: number;
      }> = [];
      for (const [filePath, latestUpdatedAt] of latestUpdatedTimes.files) {
        if (!updatedAtTimes.files.has(filePath)) {
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
      for (const [filePath, latestUpdatedAt] of latestUpdatedTimes.files) {
        if (
          updatedAtTimes.files.has(filePath) &&
          updatedAtTimes.files.get(filePath) !== latestUpdatedAt
        ) {
          modified.push({ filePath, latestUpdatedAt });
        }
      }

      // Update the cache
      if (
        updateCacheFromFileSystem(
          settings.rootDir,
          {
            added,
            deleted,
            modified,
          },
          latestUpdatedTimes.packageJsons,
          settings,
          start
        )
      ) {
        for (const updateListener of updateListeners) {
          updateListener(settings.rootDir);
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
  const relativeFilePath = getRelativePathFromRoot(rootDir, filePath);
  return (
    !relativeFilePath.includes('.test.') &&
    !relativeFilePath.includes('__test__') &&
    !relativeFilePath.includes('__tests__')
  );
}
