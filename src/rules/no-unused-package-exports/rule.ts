import { InternalError } from '../../util/error.js';
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

    // If this file doesn't have any entry points, then we can bail early and
    // avoid needing to do a more expensive filter.
    if (!fileInfo.hasEntryPoints) {
      return {};
    }

    const fileEntryPointExports = projectInfo.packageEntryPointExports
      .values()
      .filter((e) => e.filePath === context.filename);

    // Check each export and reexport to make sure it's being used
    for (const { exportEntry } of fileEntryPointExports) {
      if (exportEntry.externallyImportedBy.length === 0) {
        // Only AnalyzedBarrelReexport has an optional exportName, and
        // computeAnalyzedInfo.ts gates its entry into
        // packageEntryPointExports on exportName being truthy, so every
        // entry here has a defined exportName.
        /* istanbul ignore if */
        if (!exportEntry.exportName) {
          throw new InternalError('exportName unexpectedly undefined');
        }
        context.report({
          messageId: 'noUnusedPackageExports',
          loc: getLocFromRange(context, exportEntry.reportNodeRange),
          data: {
            name: exportEntry.exportName,
          },
        });
      }
    }

    return {};
  },
});
