import { createRule, getESMInfo } from '../util.js';

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
      noMissingImports: 'Import does not point to a valid first party export',
      noTransientDependencies:
        'Third party module specifier "{{specifier}}" is not listed in package.json.\n\nIf this module specifier points to first party code, then you likely found a bug in fast-import. Please report it.',
    },
  },
  defaultOptions: [],
  create(context) {
    const esmInfo = getESMInfo(context);
    if (!esmInfo) {
      return {};
    }

    const { fileInfo, projectInfo } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // First check imports
    outer: for (const importEntry of fileInfo.imports) {
      // First, check if this is a third party dependency, and ensure that the dependency is listed
      // in a package.json
      if (importEntry.moduleType === 'thirdParty') {
        for (const [
          path,
          deps,
        ] of projectInfo.availableThirdPartyDependencies) {
          if (
            context.filename.startsWith(path) &&
            deps.some(
              (dep) =>
                // Check if this is exactly the import specifier, e.g. 'react'
                importEntry.moduleSpecifier === dep ||
                // Check if this is reaching into the package, e.g. 'react/path'
                importEntry.moduleSpecifier?.startsWith(dep + '/')
            )
          ) {
            continue outer;
          }
        }

        // If we got here, we couldn't find a match in package.json, so error
        context.report({
          messageId: 'noTransientDependencies',
          node: importEntry.statementNode,
          data: {
            specifier: importEntry.moduleSpecifier,
          },
        });
        continue;
      }

      // Barrel/dynamic imports don't resolve to a single export, and can be
      // spread across multiple files even. The specific items being imported
      // isn't specified either in non-first party code, meaning the only way to
      // know if an import is valid is to introspect how it's used at runtime.
      // This isn't tractable, so we just don't validate them instead
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
