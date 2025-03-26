import { ESLintUtils } from '@typescript-eslint/utils';
import type { AnalyzedProjectInfo } from '../types/analyzed';
import { computeAnalyzedInfo } from '../module/computeAnalyzedInfo';
import {
  addResolvedInfoForFile,
  computeResolvedInfo,
  updateResolvedInfoForFile,
} from '../module/computeResolvedInfo';
import {
  addBaseInfoForFile,
  computeBaseInfo,
  updateBaseInfoForFile,
} from '../module/computeBaseInfo';
import { InternalError } from '../util/error';
import type { BaseProjectInfo } from '../types/base';
import type { ResolvedProjectInfo } from '../types/resolved';
import { getSettings } from '../settings/settings';
import type { GenericContext } from '../types/context';
import { debug, formatMilliseconds } from '../util/logging';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

let baseProjectInfo: BaseProjectInfo | null = null;
let resolvedProjectInfo: ResolvedProjectInfo | null = null;
let analyzedProjectInfo: AnalyzedProjectInfo | null = null;
function computeInitialProjectInfo(context: GenericContext) {
  const { rootDir, alias, allowAliaslessRootImports, entryPoints } =
    getSettings(context);

  const start = Date.now();
  baseProjectInfo = computeBaseInfo({
    rootDir,
    alias,
    allowAliaslessRootImports,
    isEntryPointCheck: (filePath, symbolName) =>
      entryPoints.some(
        ({ file, symbol }) => file === filePath && symbol === symbolName
      ),
  });
  const baseEnd = Date.now();
  resolvedProjectInfo = computeResolvedInfo(baseProjectInfo);
  const resolveEnd = Date.now();
  analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
  const analyzeEnd = Date.now();

  debug(`Initial computation complete:`);
  debug(`  base info:     ${formatMilliseconds(baseEnd - start)}`);
  debug(`  resolved info: ${formatMilliseconds(resolveEnd - start)}`);
  debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - start)}`);
}

function updateCacheForFile(context: GenericContext) {
  const { entryPoints, rootDir } = getSettings(context);

  // This shouldn't be possible and is just to make sure TypeScript is happy
  if (!baseProjectInfo || !resolvedProjectInfo || !analyzedProjectInfo) {
    throw new InternalError('Project info not initialized');
  }

  const baseOptions = {
    filePath: context.filename,
    fileContents: context.sourceCode.getText(),
    ast: context.sourceCode.ast,
    isEntryPointCheck: (filePath: string, symbolName: string) =>
      entryPoints.some(
        ({ file, symbol }) => file === filePath && symbol === symbolName
      ),
  };

  // Check if we're updating file info or adding a new file
  if (analyzedProjectInfo.files.has(context.filename)) {
    const start = Date.now();
    const shouldUpdateDerivedProjectInfo = updateBaseInfoForFile(
      baseProjectInfo,
      baseOptions
    );
    const baseEnd = Date.now();

    // If we don't need to update
    if (shouldUpdateDerivedProjectInfo) {
      updateResolvedInfoForFile(
        context.filename,
        baseProjectInfo,
        resolvedProjectInfo
      );
      const resolveEnd = Date.now();
      analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
      const analyzeEnd = Date.now();

      debug(`Update for ${context.filename.replace(rootDir, '')} complete:`);
      debug(`  base info:     ${formatMilliseconds(baseEnd - start)}`);
      debug(`  resolved info: ${formatMilliseconds(resolveEnd - start)}`);
      debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - start)}`);
    } else {
      debug(
        `No updates needed for ${context.filename.replace(rootDir, '')} complete in ${formatMilliseconds(baseEnd - start)}`
      );
    }
  } else {
    const start = Date.now();
    addBaseInfoForFile(baseProjectInfo, baseOptions);
    const baseEnd = Date.now();
    addResolvedInfoForFile(
      context.filename,
      baseProjectInfo,
      resolvedProjectInfo
    );
    const resolveEnd = Date.now();
    analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
    const analyzeEnd = Date.now();

    debug(`${context.filename.replace(rootDir, '')} add complete:`);
    debug(`  base info:     ${formatMilliseconds(baseEnd - start)}`);
    debug(`  resolved info: ${formatMilliseconds(resolveEnd - start)}`);
    debug(`  analyzed info: ${formatMilliseconds(analyzeEnd - start)}`);
  }
}

const filesWithFirstRun = new Set<string>();

export function getESMInfo(context: GenericContext) {
  // If we haven't done our first run of computing project info, do it now
  if (!analyzedProjectInfo) {
    computeInitialProjectInfo(context);
  }

  // Check if this file has been analyzed before. If it has, there may have been
  // an edit/fix that we need to repopulate our cache for first
  if (filesWithFirstRun.has(context.filename)) {
    updateCacheForFile(context);
  } else {
    filesWithFirstRun.add(context.filename);
  }

  // This shouldn't be possible and is just to make sure TypeScript is happy
  if (!analyzedProjectInfo) {
    throw new InternalError('Project info not initialized');
  }

  // Format and return the ESM info
  const fileInfo = analyzedProjectInfo.files.get(context.filename);
  if (!fileInfo) {
    return;
  }
  return {
    fileInfo,
    projectInfo: analyzedProjectInfo,
  };
}
