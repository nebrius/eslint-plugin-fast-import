import { createRule, getESMInfo, getLocFromRange } from '../util.js';

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

    // No project info means this file wasn't found as part of the project, e.g.
    // because it's ignored
    /* istanbul ignore if */
    if (!esmInfo) {
      return {};
    }

    const { fileInfo } = esmInfo;
    /* istanbul ignore if */
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // Now check reexports
    for (const reexportEntry of fileInfo.barrelReexports) {
      if (
        reexportEntry.resolvedModuleType === 'builtin' ||
        reexportEntry.resolvedModuleType === 'thirdParty'
      ) {
        context.report({
          loc: getLocFromRange(context, reexportEntry.reportNodeRange),
          messageId: 'noExternalBarrelReexports',
        });
      }
    }

    return {};
  },
});
