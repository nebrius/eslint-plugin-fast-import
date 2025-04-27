import { InternalError } from '../../util/error.js';
import { createRule, getESMInfo, getLocFromRange } from '../util.js';

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
      noMissingImports:
        'Import "{{name}}" does not point to a valid first party export',
      noTransientDependencies:
        'Third party module specifier "{{specifier}}" is not listed in package.json.',
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

    const { fileInfo, projectInfo } = esmInfo;
    /* istanbul ignore if */
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // First check imports
    outer: for (const importEntry of [
      ...fileInfo.singleImports,
      ...fileInfo.barrelImports,
      ...fileInfo.dynamicImports,
    ]) {
      // First, check if this is a third party dependency, and ensure that the dependency is listed
      // in a package.json
      if (importEntry.resolvedModuleType === 'thirdParty') {
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

        // Quick sanity check to see if there was a bug
        if (importEntry.moduleSpecifier?.startsWith('.')) {
          throw new InternalError(
            `Module specifier ${importEntry.moduleSpecifier} was misclassified as a third party import`
          );
        }

        // If we got here, we couldn't find a match in package.json, so error
        context.report({
          messageId: 'noTransientDependencies',
          loc: getLocFromRange(context, importEntry.statementNodeRange),
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
      // This isn't tractable, so we only validate that the module specifier
      // could be resolved. If the module couldn't be resolved, we mark the file
      // type as first party other, so we first have to check for that.
      if (
        importEntry.resolvedModuleType === 'firstPartyOther' &&
        importEntry.type === 'barrelImport'
      ) {
        context.report({
          loc: getLocFromRange(context, importEntry.reportNodeRange),
          messageId: 'noMissingImports',
          data: {
            name: importEntry.importAlias,
          },
        });
      }

      // Next, we check if the root export could be resolved, which is only
      // available for single imports
      if (
        importEntry.resolvedModuleType === 'firstPartyCode' &&
        importEntry.type === 'singleImport' &&
        importEntry.rootModuleType === undefined
      ) {
        context.report({
          loc: getLocFromRange(context, importEntry.reportNodeRange),
          messageId: 'noMissingImports',
          data: {
            name: importEntry.importName,
          },
        });
      }
    }

    // Now check reexports
    for (const reexportEntry of [
      ...fileInfo.singleReexports,
      ...fileInfo.barrelReexports,
    ]) {
      // First check if we couldn't resolve the module specifier. If the module
      // couldn't be resolved, we mark the file type as first party other, so
      // we first have to check for that.
      if (
        reexportEntry.resolvedModuleType === 'firstPartyOther' &&
        reexportEntry.type === 'barrelReexport'
      ) {
        context.report({
          loc: getLocFromRange(context, reexportEntry.reportNodeRange),
          messageId: 'noMissingImports',
          data: {
            name: reexportEntry.exportName,
          },
        });
      }

      // Next, we check if the root export could be resolved, which is only
      // available for single reexports
      if (
        reexportEntry.resolvedModuleType === 'firstPartyCode' &&
        reexportEntry.type === 'singleReexport' &&
        reexportEntry.rootModuleType === undefined
      ) {
        context.report({
          loc: getLocFromRange(context, reexportEntry.reportNodeRange),
          messageId: 'noMissingImports',
          data: {
            name: reexportEntry.exportName,
          },
        });
      }
    }

    return {};
  },
});
