import { createRule, getESMInfo, getLocFromRange } from '../util.js';

export const noUnusedPackageExports = createRule({
  name: 'no-unused-package-exports',
  meta: {
    docs: {
      description: 'Ensure entry point exports are imported elsewhere in the monorepo',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noUnusedPackageExports: 'Export point export "{{name}}" must be imported in another package',
    },
  },
  create(context) {
    const esmInfo = getESMInfo(context);

    // No project info means this file wasn't found as part of the project, e.g.
    // because it's ignored
    /* istanbul ignore if */
    if (!esmInfo) {
      return {};
    }

    const { fileInfo, projectInfo } = esmInfo;
    /* istanbul ignore if */
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // If this file doesn't have any entry points, then we don't need to check it
    if (!fileInfo.hasEntryPoints) {
      return {};
    }

    const fileEntryPointExports = projectInfo.packageEntryPointExports
      .values()
      .filter((e) => e.filePath === context.filename);

    // Check each export and reexport to make sure it's being used
    for (const { exportEntry } of fileEntryPointExports) {
      if (exportEntry.externallyImportedBy.length === 0) {
        context.report({
          messageId: 'noUnusedPackageExports',
          loc: getLocFromRange(context, exportEntry.reportNodeRange),
          data: {
            name: exportEntry.exportName || '<unnamed>',
          },
        });
      }
    }

    return {};
  },
});
