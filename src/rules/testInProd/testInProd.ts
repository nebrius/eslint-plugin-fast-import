import { createRule, getESMInfo, isNonTestFile } from '../util.js';

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
    if (!esmInfo) {
      return {};
    }

    const { fileInfo } = esmInfo;
    if (
      fileInfo.fileType !== 'code' ||
      !isNonTestFile(context.filename, esmInfo.projectInfo.rootDir)
    ) {
      return {};
    }

    for (const importEntry of [...fileInfo.imports, ...fileInfo.reexports]) {
      if (
        importEntry.moduleType !== 'firstPartyCode' &&
        importEntry.moduleType !== 'firstPartyOther'
      ) {
        continue;
      }
      if (
        importEntry.resolvedModulePath &&
        !isNonTestFile(
          importEntry.resolvedModulePath,
          esmInfo.projectInfo.rootDir
        )
      ) {
        context.report({
          node: importEntry.reportNode,
          messageId: 'noTestImports',
        });
      }
    }

    return {};
  },
});
