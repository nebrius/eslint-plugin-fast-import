import {
  createRule,
  getESMInfo,
  getLocFromRange,
  isNonTestFile,
} from '../util.js';

export const noTestImportsInProd = createRule({
  name: 'no-test-imports-in-prod',
  meta: {
    docs: {
      description: 'Ensures that production code does not import test code',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noTestImports: 'Test code should not be imported in production code',
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

    const { fileInfo, settings } = esmInfo;
    if (
      fileInfo.fileType !== 'code' ||
      !isNonTestFile(context.filename, esmInfo.projectInfo.rootDir, settings)
    ) {
      return {};
    }

    for (const importEntry of [
      ...fileInfo.singleImports,
      ...fileInfo.barrelImports,
      ...fileInfo.dynamicImports,
      ...fileInfo.singleReexports,
      ...fileInfo.barrelReexports,
    ]) {
      if (
        importEntry.resolvedModuleType !== 'firstPartyCode' &&
        importEntry.resolvedModuleType !== 'firstPartyOther'
      ) {
        continue;
      }
      if (
        importEntry.resolvedModulePath &&
        !isNonTestFile(
          importEntry.resolvedModulePath,
          esmInfo.projectInfo.rootDir,
          settings
        )
      ) {
        context.report({
          loc: getLocFromRange(context, importEntry.reportNodeRange),
          messageId: 'noTestImports',
        });
      }
    }

    return {};
  },
});
