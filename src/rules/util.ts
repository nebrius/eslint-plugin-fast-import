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

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

let baseProjectInfo: BaseProjectInfo | null = null;
let resolvedProjectInfo: ResolvedProjectInfo | null = null;
let analyzedProjectInfo: AnalyzedProjectInfo | null = null;
function computeInitialProjectInfo(context: GenericContext) {
  const { rootDir, rootImportAlias, allowAliaslessRootImports, entryPoints } =
    getSettings(context);

  baseProjectInfo = computeBaseInfo({
    rootDir,
    rootImportAlias,
    allowAliaslessRootImports,
    isEntryPointCheck: (filePath, symbolName) =>
      entryPoints.some(
        ({ file, symbol }) => file === filePath && symbol === symbolName
      ),
  });
  resolvedProjectInfo = computeResolvedInfo(baseProjectInfo);
  analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
}

export function getESMInfo(context: GenericContext) {
  const { entryPoints } = getSettings(context);

  // If we haven't done our first run of computing project info, do it now
  if (!analyzedProjectInfo) {
    computeInitialProjectInfo(context);
  }

  // This shouldn't be possible in reality and is just to make sure TypeScript is happy
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

  // Check if we're updating file info or adding a new file, and update project info as appropriate
  if (context.filename in analyzedProjectInfo.files) {
    const shouldUpdateDerivedProjectInfo = updateBaseInfoForFile(
      baseProjectInfo,
      baseOptions
    );

    if (shouldUpdateDerivedProjectInfo) {
      updateResolvedInfoForFile(
        context.filename,
        baseProjectInfo,
        resolvedProjectInfo
      );
      analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
    }
  } else {
    addBaseInfoForFile(baseProjectInfo, baseOptions);
    addResolvedInfoForFile(
      context.filename,
      baseProjectInfo,
      resolvedProjectInfo
    );
    analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
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
