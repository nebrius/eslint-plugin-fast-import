import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { createRule, getESMInfo } from '../util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function isNonTestFile(filePath: string, rootDir: string) {
  const relativeFilePath = filePath.replace(`${rootDir}/`, '');
  return (
    !relativeFilePath.includes('.test.') &&
    !relativeFilePath.includes('__test__') &&
    !relativeFilePath.includes('__tests__')
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

    // ESLint isn't applying defaults, so options is length 0 when consumers
    // don't specify options, even though ESLint is supposed to do that. I'm not
    // sure what's going on
    const { allowNonTestTypeExports = true } = context.options[0] ?? {};

    const esmInfo = getESMInfo(context);

    // No project info means this file wasn't found as part of the project, e.g.
    // because it's ignored
    if (!esmInfo) {
      return {};
    }

    const {
      fileInfo,
      projectInfo: { rootDir },
    } = esmInfo;
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    // Check each export and reexport to make sure it's being used
    for (const exportEntry of [...fileInfo.exports, ...fileInfo.reexports]) {
      // If this is an entry point, then it's being imported externally
      if (exportEntry.isEntryPoint) {
        continue;
      }

      // If imported by is empty, then this isn't used anywhere
      if (exportEntry.importedByFiles.length === 0) {
        context.report({
          messageId: 'noUnusedExports',
          node: exportEntry.reportNode,
        });
      }

      // Otherwise, check to see if all of its imports are only in tests
      else if (
        isNonTestFile(context.filename, rootDir) &&
        !exportEntry.importedByFiles.some((i) => isNonTestFile(i, rootDir))
      ) {
        if (
          !(`isTypeExport` in exportEntry) ||
          !exportEntry.isTypeExport ||
          !allowNonTestTypeExports
        ) {
          context.report({
            messageId: 'noTestOnlyImports',
            node: exportEntry.reportNode,
          });
        }
      }
    }

    return {};
  },
});
