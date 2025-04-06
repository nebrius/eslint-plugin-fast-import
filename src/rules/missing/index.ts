import { createRule, getESMInfo } from '../util';

export const noMissingImports = createRule({
  name: 'no-missing-imports',
  meta: {
    docs: {
      description: 'Ensures that imports point to valid exports',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noMissingImports: 'Import does not point to a valid export',
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

    // First check imports
    for (const importEntry of fileInfo.imports) {
      // Barrel/dynamic imports don't resolve to a single export, and can be
      // spread across multiple files even. The specific items being imported
      // isn't specified either, meaning the only way to know if an import is
      // valid is to introspect how it's used at runtime. This isn't tractable,
      // so we just don't validate them instead
      if (
        importEntry.moduleType !== 'firstPartyCode' ||
        importEntry.importType !== 'single'
      ) {
        continue;
      }
      if (importEntry.rootModuleType === undefined) {
        context.report({
          node: importEntry.reportNode,
          messageId: 'noMissingImports',
        });
      }
    }

    // Now check reexports
    for (const reexportEntry of fileInfo.reexports) {
      if (
        reexportEntry.moduleType !== 'firstPartyCode' ||
        reexportEntry.reexportType !== 'single'
      ) {
        continue;
      }
      if (reexportEntry.rootModuleType === undefined) {
        context.report({
          node: reexportEntry.reportNode,
          messageId: 'noMissingImports',
        });
      }
    }

    return {};
  },
});
