import type {
  ImportDeclaration,
  ReexportDeclaration,
} from '../../module/util.js';
import { InternalError } from '../../util/error.js';
import { createRule, getESMInfo } from '../util.js';

export const nodePrefix = createRule({
  name: 'require-node-prefix',
  meta: {
    docs: {
      description:
        'Ensures that imports of Node.js modules use the `node:` prefix',
    },
    schema: [],
    fixable: 'code',
    type: 'problem',
    messages: {
      missingNodePrefix:
        'Import of Node.js built-in modules must use the `node:` prefix',
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

    for (const importEntry of [...fileInfo.imports, ...fileInfo.reexports]) {
      const { moduleSpecifier } = importEntry;
      if (
        moduleSpecifier &&
        importEntry.moduleType === 'builtin' &&
        !moduleSpecifier.startsWith('node:')
      ) {
        const { statementNode } = importEntry;
        context.report({
          node: statementNode,
          messageId: 'missingNodePrefix',
          fix(fixer) {
            const sourceNode = statementNode as
              | ImportDeclaration
              | ReexportDeclaration;
            if (!('raw' in sourceNode.source)) {
              throw new InternalError(
                `Property "raw" is missing in sourceNode.source`
              );
            }
            return fixer.replaceText(
              sourceNode.source,
              sourceNode.source.raw.replace(
                moduleSpecifier,
                `node:${moduleSpecifier}`
              )
            );
          },
        });
      }
    }

    return {};
  },
});
