import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type {
  AnalyzedImport,
  AnalyzedProjectInfo,
  AnalyzedReexport,
} from '../../types/analyzed';
import { createRule, getESMInfo } from '../util';
import { InternalError } from '../../util/error';

type Options = [];
type MessageIds = 'noCircularImports';

function checkFile(
  context: RuleContext<MessageIds, Options>,
  filePath: string,
  projectInfo: AnalyzedProjectInfo,
  importStack: Array<{
    filePath: string;
    importEntry: AnalyzedImport | AnalyzedReexport;
  }>,
  visitedFiles: string[]
) {
  const fileDetails = projectInfo.files.get(filePath);
  if (!fileDetails) {
    throw new InternalError(`Could not get file info for "${filePath}"`);
  }

  // Non-JS files by definition can't be circilar, since they can't import JS
  if (fileDetails.fileType !== 'code') {
    return;
  }

  // Mark this file as visited
  visitedFiles.push(filePath);

  // Now check if this next file is part of a cycle
  const firstInstance = importStack.find((i) => i.filePath === filePath);
  if (firstInstance) {
    const filesInCycle = importStack.slice(importStack.indexOf(firstInstance));
    for (const fileInCycle of filesInCycle) {
      context.report({
        messageId: 'noCircularImports',
        node: fileInCycle.importEntry.statementNode,
      });
    }
    return;
  }

  // If this wasn't a cycle, then keep exploring
  for (const importEntry of [
    ...fileDetails.imports,
    ...fileDetails.reexports,
  ]) {
    if (
      ('isTypeImport' in importEntry && importEntry.isTypeImport) ||
      ('isTypeReexport' in importEntry && importEntry.isTypeReexport) ||
      importEntry.moduleType !== 'firstPartyCode' ||
      visitedFiles.includes(importEntry.resolvedModulePath)
    ) {
      continue;
    }
  }
}

export const noCircularImports = createRule<Options, MessageIds>({
  name: 'no-circular-imports',
  meta: {
    docs: {
      description: 'Ensures that there are no circular imports',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noCircularImports: 'Imports cannot be circular',
    },
  },
  defaultOptions: [],
  create(context) {
    const esmInfo = getESMInfo(context);

    // No project info means this file wasn't found as part of the project, e.g.
    // because it's ignored
    if (!esmInfo) {
      return {};
    }

    checkFile(context, context.filename, esmInfo.projectInfo, [], []);
    return {};
  },
});
