import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { createRule, getESMInfo } from '../util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function isNonTestFile(filePath: string) {
  return (
    !filePath.includes('.test.') &&
    !filePath.includes('__test__') &&
    !filePath.includes('__tests__')
  );
}

const schema = z
  .strictObject({
    allowNonTestTypeExports: z.boolean(),
  })
  .optional();

type Options = z.infer<typeof schema>;

export const noUnusedExports = createRule<
  [Options],
  'noUnusedExports' | 'noTestOnlyImports'
>({
  name: 'no-unused-exports',
  meta: {
    docs: {
      description: 'Ensures that all exports are imported in another file',
    },
    schema: [zodToJsonSchema(schema) as JSONSchema4],
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

    // ESLint isn't applying defaults and options is length 0 when consumers don't specify options, even though ESLint
    // is supposed to do that. I'm not sure what's going on
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
      if (
        !exportEntry.isEntryPoint &&
        exportEntry.importedByFiles.length === 0
      ) {
        context.report({
          messageId: 'noUnusedExports',
          node: exportEntry.specifierNode,
        });
      } else if (
        !exportEntry.isEntryPoint &&
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
