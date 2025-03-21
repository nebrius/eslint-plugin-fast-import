import { ESLintUtils } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
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

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

let baseProjectInfo: BaseProjectInfo | null = null;
let resolvedProjectInfo: ResolvedProjectInfo | null = null;
let analyzedProjectInfo: AnalyzedProjectInfo | null = null;
function computeInitialProjectInfo<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: RuleContext<MessageIds, Options>) {
  const fastEsmSettings = context.settings['fast-esm'] as
    | Record<string, unknown>
    | undefined;
  if (!fastEsmSettings) {
    throw new Error(`fast-esm settings are required`);
  }
  const { sourceRoot, rootImportAlias, allowAliaslessRootImports } =
    fastEsmSettings;

  if (typeof sourceRoot !== 'string') {
    throw new Error(
      `"sourceRoot" must be specified as a string in ESLint settings`
    );
  }

  if (
    typeof rootImportAlias !== 'string' &&
    typeof rootImportAlias !== 'undefined'
  ) {
    throw new Error(`"rootImportAlias" must be a string or undefined`);
  }

  if (
    typeof allowAliaslessRootImports !== 'boolean' &&
    typeof allowAliaslessRootImports !== 'undefined'
  ) {
    throw new Error(
      `"allowAliaslessRootImports" must be a string or undefined`
    );
  }

  baseProjectInfo = computeBaseInfo({
    sourceRoot,
    rootImportAlias,
    allowAliaslessRootImports,

    // TODO
    isEntryPointCheck: () => false,
  });
  resolvedProjectInfo = computeResolvedInfo(baseProjectInfo);
  analyzedProjectInfo = computeAnalyzedInfo(resolvedProjectInfo);
}

export function getESMInfo<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: RuleContext<MessageIds, Options>) {
  // If we haven't initialized the project info yet, do so now
  if (!analyzedProjectInfo) {
    computeInitialProjectInfo(context);
  }
  if (!baseProjectInfo || !resolvedProjectInfo || !analyzedProjectInfo) {
    throw new InternalError('Project info not initialized');
  }

  const baseOptions = {
    filePath: context.filename,
    fileContents: context.sourceCode.getText(),
    ast: context.sourceCode.ast,

    // TODO
    isEntryPointCheck: () => false,
  };

  // Check if we're updating file info or adding a new file
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

  const fileInfo = analyzedProjectInfo.files[context.filename];

  // Records are too smart for their own good sometimes, this actually can be undefined
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!fileInfo) {
    return;
  }

  return {
    fileInfo,
    projectInfo: analyzedProjectInfo,
  };
}
