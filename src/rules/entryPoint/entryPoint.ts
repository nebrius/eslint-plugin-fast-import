import { createRule, getESMInfo, getLocFromRange } from '../util.js';

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

    const { fileInfo, projectInfo } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    for (const importEntry of fileInfo.singleImports) {
      if (
        importEntry.rootModuleType === 'firstPartyCode' &&
        importEntry.rootExportEntry.isEntryPoint
      ) {
        context.report({
          messageId: 'noEntryPointImports',
          loc: getLocFromRange(context, importEntry.reportNodeRange),
        });
      }
    }

    for (const importEntry of fileInfo.barrelImports) {
      if (!importEntry.resolvedModulePath) {
        continue;
      }
      const fileDetails = projectInfo.files.get(importEntry.resolvedModulePath);
      if (fileDetails?.fileType !== 'code') {
        continue;
      }
      if (fileDetails.hasEntryPoints) {
        context.report({
          messageId: 'noEntryPointImports',
          loc: getLocFromRange(context, importEntry.reportNodeRange),
        });
      }
    }

    return {};
  },
});
