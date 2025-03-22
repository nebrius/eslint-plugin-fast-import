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
import { z } from 'zod';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

const settingsSchema = z.strictObject({
  rootDir: z.string(),
  rootImportAlias: z.string().optional(),
  allowAliaslessRootImports: z.boolean().optional(),
  entryPoints: z
    .array(
      z.strictObject({
        file: z.string(),
        symbol: z.string(),
      })
    )
    .optional(),
});

function getSettingsFromContext(
  context: RuleContext<string, readonly unknown[]>
) {
  const fastEsmSettings = context.settings['fast-esm'];
  if (!fastEsmSettings) {
    throw new Error(`fast-esm settings are required`);
  }
  const parseResult = settingsSchema.safeParse(fastEsmSettings);

  if (!parseResult.success) {
    const issues: string[] = [];
    for (const issue of parseResult.error.issues) {
      let formattedIssue = issue.code.replace('_', ' ');
      formattedIssue = `  ${formattedIssue[0].toUpperCase() + formattedIssue.slice(1)}`;
      if (issue.path.length) {
        formattedIssue += ` for property "${issue.path.join('.')}"\n`;
      } else {
        formattedIssue += '\n';
      }
      for (const [key, value] of Object.entries(issue)) {
        if (key !== 'code' && key !== 'path') {
          formattedIssue += `    ${key}: ${String(value)}\n`;
        }
      }
      issues.push(formattedIssue);
    }
    throw new Error('Invalid fast-esm settings:\n' + issues.join('\n'));
  }

  const { rootDir, rootImportAlias, allowAliaslessRootImports, entryPoints } =
    parseResult.data;

  return {
    rootDir,
    rootImportAlias,
    allowAliaslessRootImports: allowAliaslessRootImports ?? false,
    entryPoints: entryPoints ?? [],
  };
}

let baseProjectInfo: BaseProjectInfo | null = null;
let resolvedProjectInfo: ResolvedProjectInfo | null = null;
let analyzedProjectInfo: AnalyzedProjectInfo | null = null;
function computeInitialProjectInfo<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: RuleContext<MessageIds, Options>) {
  const { rootDir, rootImportAlias, allowAliaslessRootImports, entryPoints } =
    getSettingsFromContext(context);

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

export function getESMInfo<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: RuleContext<MessageIds, Options>) {
  const { entryPoints } = getSettingsFromContext(context);

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
    isEntryPointCheck: (filePath: string, symbolName: string) =>
      entryPoints.some(
        ({ file, symbol }) => file === filePath && symbol === symbolName
      ),
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
