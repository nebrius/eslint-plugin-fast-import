import { createRule, getESMInfo } from '../util';
import type { FromSchema } from 'json-schema-to-ts';

function isNonTestFile(filePath: string) {
  return (
    !filePath.includes('.test.') &&
    !filePath.includes('__test__') &&
    !filePath.includes('__tests__')
  );
}

const schema = {
  type: 'object',
  properties: {
    allowNonTestTypeExports: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

type Options = FromSchema<typeof schema>;

export const noUnusedExports = createRule<
  [Options],
  'noUnusedExports' | 'noTestOnlyImports'
>({
  name: 'no-unused-exports',
  meta: {
    docs: {
      description: 'Ensures that all exports are imported in another file',
    },
    schema: [schema],
    fixable: undefined,
    type: 'problem',
    messages: {
      noUnusedExports: 'Exports must be imported in another file',
      noTestOnlyImports:
        'Exports in non-test files must be imported by other non-test files',
    },
  },
  defaultOptions: [
    {
      allowNonTestTypeExports: true,
    },
  ],
  create(context) {
    // .d.ts files by definition don't have direct imports, and so can't be checked
    if (context.filename.endsWith('.d.ts')) {
      return {};
    }

    // For some reason, ESLint isn't applying defaults
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const { allowNonTestTypeExports = true } = context.options[0] ?? {};

    const esmInfo = getESMInfo(context);

    // No project info means this file wasn't found as part of the project, e.g. because it's ignored
    if (!esmInfo) {
      return {};
    }

    const { fileInfo } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    for (const exportEntry of fileInfo.exports) {
      if (exportEntry.importedByFiles.length === 0) {
        context.report({
          messageId: 'noUnusedExports',
          node: exportEntry.specifierNode,
        });
      } else if (
        isNonTestFile(context.filename) &&
        !exportEntry.importedByFiles.some(isNonTestFile) &&
        !allowNonTestTypeExports
      ) {
        context.report({
          messageId: 'noTestOnlyImports',
          node: exportEntry.specifierNode,
        });
      }
    }

    return {};
  },
});
