import { createRule, getESMInfo } from '../util.js';

export const noExternalBarrelReexports = createRule({
  name: 'no-external-barrel-reexports',
  meta: {
    docs: {
      description:
        'Ensures that code does not barrel reexport builtin or third party modules. Doing so is not supported by fast-import for performance reasons',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noExternalBarrelReexports:
        'Barrel reexporting builtin or third party modules is not supported',
    },
  },
  defaultOptions: [],
  create(context) {
    const esmInfo = getESMInfo(context);
    if (!esmInfo) {
      return {};
    }

    const { fileInfo } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // Now check reexports
    for (const reexportEntry of fileInfo.reexports) {
      if (reexportEntry.reexportType === 'single') {
        continue;
      }
      if (
        reexportEntry.moduleType === 'builtin' ||
        reexportEntry.moduleType === 'thirdParty'
      ) {
        context.report({
          node: reexportEntry.reportNode,
          messageId: 'noExternalBarrelReexports',
        });
      }
    }

    return {};
  },
});
