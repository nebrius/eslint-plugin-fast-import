import { ESLintUtils } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { AnalyzedProjectInfo } from '../types/analyzed';
import { computeAnalyzedInfo } from '../module/computeAnalyzedInfo';
import { computeResolvedInfo } from '../module/computeResolvedInfo';
import { computeBaseInfo } from '../module/computeBaseInfo';
import { InternalError } from '../util/error';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

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

  analyzedProjectInfo = computeAnalyzedInfo(
    computeResolvedInfo(
      computeBaseInfo({
        sourceRoot,
        rootImportAlias,
        allowAliaslessRootImports,

        // TODO
        isEntryPointCheck: () => false,
      })
    )
  );
}

export function getESMInfo<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: RuleContext<MessageIds, Options>) {
  const filename = context.filename;
  // const { ast } = context.sourceCode;

  // If we haven't initialized the project info yet, do so now
  if (!analyzedProjectInfo) {
    computeInitialProjectInfo(context);
  }
  if (!analyzedProjectInfo) {
    throw new InternalError('Analyzed project info not initialized');
  }

  // TODO: cache updating here

  const fileInfo = analyzedProjectInfo.files[filename];

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
