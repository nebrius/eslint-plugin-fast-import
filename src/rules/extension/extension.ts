import { extname } from 'node:path';

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { z } from 'zod';

import { InternalError } from '../../util/error.js';
import { createRule, getESMInfo, getLocFromRange } from '../util.js';

type ImportDeclaration = TSESTree.ImportDeclaration | TSESTree.ImportExpression;
type ReexportDeclaration =
  | TSESTree.ExportNamedDeclarationWithSource
  | TSESTree.ExportAllDeclaration;

const MODE_DEFAULT = 'always';
const FORCE_TS_EXTENSION_DEFAULT = false;
const schema = z
  .strictObject({
    mode: z.enum(['always', 'never']).optional(),
    forceTsExtension: z.boolean().optional(),
  })
  .optional();
type Options = z.infer<typeof schema>;

const EXTENSION_REGEX = /(\.jsx?|\.mjsx?|\.cjsx?|\.tsx?|\.mtsx?|\.ctsx?)$/;

export const consistentFileExtensions = createRule<
  [Options],
  'missingExtension' | 'extraExtension' | 'incorrectExtension'
>({
  name: 'consistent-file-extensions',
  meta: {
    docs: {
      description:
        'Ensures that first party imports always or never include file extensions',
    },
    schema: [schema.toJSONSchema() as JSONSchema4],
    fixable: 'code',
    type: 'problem',
    messages: {
      missingExtension: 'First party imports must include file extensions',
      extraExtension: 'First party imports must not include file extensions',
      incorrectExtension:
        'First party imports of TypeScript files must use TypeScript extensions',
    },
  },
  defaultOptions: [
    { mode: MODE_DEFAULT, forceTsExtension: FORCE_TS_EXTENSION_DEFAULT },
  ],
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

    // ESLint isn't applying defaults, so options is length 0 when consumers
    // don't specify options, even though ESLint is supposed to do that. I'm not
    // sure what's going on
    const {
      mode = MODE_DEFAULT,
      forceTsExtension = FORCE_TS_EXTENSION_DEFAULT,
    } = context.options[0] ?? {};

    /* istanbul ignore if */
    if (mode === 'never' && forceTsExtension) {
      throw new Error('forceTsExtension cannot be true when mode is never');
    }

    for (const importEntry of [
      ...fileInfo.singleImports,
      ...fileInfo.barrelImports,
      ...fileInfo.dynamicImports,
      ...fileInfo.singleReexports,
      ...fileInfo.barrelReexports,
    ]) {
      const {
        moduleSpecifier,
        resolvedModuleType,
        resolvedModulePath,
        statementNodeRange,
      } = importEntry;
      if (!moduleSpecifier || resolvedModuleType !== 'firstPartyCode') {
        continue;
      }
      if (mode === 'always' && !EXTENSION_REGEX.test(moduleSpecifier)) {
        context.report({
          messageId: 'missingExtension',
          loc: getLocFromRange(context, importEntry.reportNodeRange),
          fix(fixer) {
            const sourceNode = context.sourceCode.getNodeByRangeIndex(
              statementNodeRange[0]
            ) as ImportDeclaration | ReexportDeclaration;
            /* istanbul ignore if */
            if (!('raw' in sourceNode.source)) {
              throw new InternalError(
                `Property "raw" is missing in sourceNode.source`
              );
            }
            return fixer.replaceText(
              sourceNode.source,
              sourceNode.source.raw.replace(
                moduleSpecifier,
                moduleSpecifier + extname(resolvedModulePath)
              )
            );
          },
        });
      } else if (mode === 'never' && EXTENSION_REGEX.test(moduleSpecifier)) {
        context.report({
          messageId: 'extraExtension',
          loc: getLocFromRange(context, importEntry.reportNodeRange),
          fix(fixer) {
            const sourceNode = context.sourceCode.getNodeByRangeIndex(
              statementNodeRange[0]
            ) as ImportDeclaration | ReexportDeclaration;
            /* istanbul ignore if */
            if (!('raw' in sourceNode.source)) {
              throw new InternalError(
                `Property "raw" is missing in sourceNode.source`
              );
            }
            return fixer.replaceText(
              sourceNode.source,
              sourceNode.source.raw.replace(
                moduleSpecifier,
                moduleSpecifier.replace(EXTENSION_REGEX, '')
              )
            );
          },
        });
      }
      if (
        forceTsExtension &&
        !resolvedModulePath.endsWith(extname(moduleSpecifier))
      ) {
        context.report({
          messageId: 'incorrectExtension',
          loc: getLocFromRange(context, importEntry.reportNodeRange),
        });
      }
    }

    return {};
  },
});
