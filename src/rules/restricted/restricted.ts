import { isAbsolute, resolve } from 'node:path';

import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { createRule, getESMInfo, getLocFromRange } from '../util.js';

const firstPartyEntrySchema = z.strictObject({
  type: z.enum(['first-party']),
  filepath: z.union([z.string(), z.instanceof(RegExp)]),
  allowed: z.array(z.union([z.string(), z.instanceof(RegExp)])).optional(),
  denied: z.array(z.union([z.string(), z.instanceof(RegExp)])).optional(),
  message: z.string().optional(),
});

const thirdPartyEntrySchema = z.strictObject({
  type: z.enum(['third-party', 'built-in']),
  moduleSpecifier: z.union([z.string(), z.instanceof(RegExp)]),
  allowed: z.array(z.union([z.string(), z.instanceof(RegExp)])).optional(),
  denied: z.array(z.union([z.string(), z.instanceof(RegExp)])).optional(),
  message: z.string().optional(),
});

const entrySchema = z.union([firstPartyEntrySchema, thirdPartyEntrySchema]);
const schema = z.strictObject({
  rules: z.array(entrySchema),
});

type FirstPartyEntry = z.infer<typeof firstPartyEntrySchema>;
type ThirdPartyEntry = z.infer<typeof thirdPartyEntrySchema>;
type Entry = FirstPartyEntry | ThirdPartyEntry;

export const noRestrictedImports = createRule<
  [{ rules: Entry[] }],
  'restrictedImport'
>({
  name: 'no-restricted-imports',
  meta: {
    docs: {
      description:
        'Esnures restricted imports are only imported by allowed consumers',
    },
    schema: [zodToJsonSchema(schema) as JSONSchema4],
    fixable: 'code',
    type: 'problem',
    messages: {
      restrictedImport: '{{message}}',
    },
  },
  defaultOptions: [{ rules: [] }],
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

    // Normalize allowed and denied string paths to absolute
    const entries: Entry[] = [];
    for (const originalEntry of context.options[0].rules) {
      const entry = { ...originalEntry };
      entries.push(entry);
      if (entry.allowed) {
        entry.allowed = entry.allowed.map((allowed) => {
          if (typeof allowed === 'string' && !isAbsolute(allowed)) {
            return resolve(esmInfo.projectInfo.rootDir, allowed);
          }
          return allowed;
        });
      }
      if (entry.denied) {
        entry.denied = entry.denied.map((denied) => {
          if (typeof denied === 'string' && !isAbsolute(denied)) {
            return resolve(esmInfo.projectInfo.rootDir, denied);
          }
          return denied;
        });
      }
      if (entry.type === 'first-party') {
        // Normalize string paths to absolute
        if (typeof entry.filepath === 'string' && !isAbsolute(entry.filepath)) {
          entry.filepath = resolve(esmInfo.projectInfo.rootDir, entry.filepath);
        }
      }
    }

    // Check each import and reexport
    for (const importEntry of [
      ...fileInfo.singleImports,
      ...fileInfo.barrelImports,
      ...fileInfo.dynamicImports,
      ...fileInfo.singleReexports,
      ...fileInfo.barrelReexports,
    ]) {
      const { moduleSpecifier } = importEntry;
      if (!moduleSpecifier) {
        continue;
      }

      for (const entry of entries) {
        // Check if this import applies to this entry
        if (entry.type === 'third-party') {
          // Check if the module specifier matches
          if (typeof entry.moduleSpecifier === 'string') {
            if (entry.moduleSpecifier !== moduleSpecifier) {
              continue;
            }
          } else if (!entry.moduleSpecifier.test(moduleSpecifier)) {
            continue;
          }
        } else if (entry.type === 'first-party') {
          // First we have to make sure we could resolve the module specifier to
          // a file path. Otherwise we ignore it, since this is either a broken
          // import or a dynamic import
          if (!importEntry.resolvedModulePath) {
            continue;
          }

          // Check if the resolved module path matches
          if (typeof entry.filepath === 'string') {
            if (entry.filepath !== importEntry.resolvedModulePath) {
              continue;
            }
          } else if (!entry.filepath.test(importEntry.resolvedModulePath)) {
            continue;
          }
        }

        // Check if the module specifier is allowed
        if (entry.allowed) {
          let isAllowed = false;
          for (const allowed of entry.allowed) {
            if (typeof allowed === 'string') {
              if (allowed === context.filename) {
                isAllowed = true;
              }
            } else if (allowed.test(context.filename)) {
              isAllowed = true;
            }
          }
          if (!isAllowed) {
            context.report({
              loc: getLocFromRange(context, importEntry.statementNodeRange),
              messageId: 'restrictedImport',
              data: {
                message:
                  entry.message ??
                  `${context.filename} is not allowed to import ${moduleSpecifier}`,
              },
            });
            continue;
          }
        }

        // Check if the module specifier is denied
        if (entry.denied) {
          let isDenied = false;
          for (const denied of entry.denied) {
            if (typeof denied === 'string') {
              if (denied === context.filename) {
                isDenied = true;
              }
            } else if (denied.test(context.filename)) {
              isDenied = true;
            }
          }
          if (isDenied) {
            context.report({
              loc: getLocFromRange(context, importEntry.statementNodeRange),
              messageId: 'restrictedImport',
              data: {
                message:
                  entry.message ??
                  `${context.filename} is denied from importing ${moduleSpecifier}`,
              },
            });
          }
        }
      }
    }

    return {};
  },
});
