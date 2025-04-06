import { createRule, getESMInfo } from '../util';

export const noEntryPointImports = createRule({
  name: 'no-entry-point-imports',
  meta: {
    docs: {
      description: 'Ensures that exports in entry point files are not imported',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noEntryPointImports: 'Entry point exports should be not imported',
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

    const { fileInfo } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    for (const exportEntry of [...fileInfo.exports, ...fileInfo.reexports]) {
      if (exportEntry.isEntryPoint && exportEntry.importedByFiles.length) {
        context.report({
          messageId: 'noEntryPointImports',
          node: exportEntry.reportNode,
        });
      }
    }

    return {};
  },
});
