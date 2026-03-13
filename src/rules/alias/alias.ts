import { dirname, relative, resolve } from 'node:path';

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { z } from 'zod';

import { InternalError } from '../../util/error.js';
import { createRule, getESMInfo, getLocFromRange } from '../util.js';

type ImportDeclaration = TSESTree.ImportDeclaration | TSESTree.ImportExpression;
type ReexportDeclaration =
  | TSESTree.ExportNamedDeclarationWithSource
  | TSESTree.ExportAllDeclaration;

const MODE_DEFAULT = 'relative-if-descendant';

const schema = z
  .strictObject({
    mode: z.enum(['always', 'relative-if-descendant']).optional(),
  })
  .optional();
type Options = z.infer<typeof schema>;

/**
 * Find the best matching wildcard alias for an absolute path.
 * Returns the entry with the longest (most specific) path match.
 */
function findBestWildcardAlias(
  absolutePath: string,
  wildcardAliases: Record<string, string>
): { symbol: string; path: string } | undefined {
  let best: { symbol: string; path: string } | undefined;
  for (const [symbol, path] of Object.entries(wildcardAliases)) {
    if (
      absolutePath.startsWith(path) &&
      (!best || path.length > best.path.length)
    ) {
      best = { symbol, path };
    }
  }
  return best;
}

export const preferAliasImports = createRule<
  [Options],
  'preferAlias' | 'preferRelative'
>({
  name: 'prefer-alias-imports',
  meta: {
    docs: {
      description:
        'Enforces the use of alias imports instead of relative paths when an alias is available, and vice versa for files under the same alias',
    },
    schema: [schema.toJSONSchema() as JSONSchema4],
    fixable: 'code',
    type: 'suggestion',
    messages: {
      preferAlias:
        'Use alias import "{{alias}}" instead of relative path "{{relative}}"',
      preferRelative:
        'Use relative import "{{relative}}" instead of alias "{{alias}}" for files under the same alias',
    },
  },
  defaultOptions: [{ mode: MODE_DEFAULT }],
  create(context) {
    const esmInfo = getESMInfo(context);

    /* istanbul ignore if */
    if (!esmInfo) {
      return {};
    }

    const { fileInfo, settings } = esmInfo;
    /* istanbul ignore if */
    if (fileInfo.fileType !== 'code') {
      return {};
    }

    const { wildcardAliases, fixedAliases } = settings;

    // No aliases configured — nothing to enforce
    if (
      Object.keys(wildcardAliases).length === 0 &&
      Object.keys(fixedAliases).length === 0
    ) {
      return {};
    }

    const { mode = MODE_DEFAULT } = context.options[0] ?? {};

    // Pre-compute the current file's "home alias" for relative-if-descendant mode
    const homeAlias = findBestWildcardAlias(context.filename, wildcardAliases);

    for (const importEntry of [
      ...fileInfo.singleImports,
      ...fileInfo.barrelImports,
      ...fileInfo.dynamicImports,
      ...fileInfo.singleReexports,
      ...fileInfo.barrelReexports,
    ]) {
      const { moduleSpecifier, resolvedModuleType, statementNodeRange } =
        importEntry;

      if (
        !moduleSpecifier ||
        (resolvedModuleType !== 'firstPartyCode' &&
          resolvedModuleType !== 'firstPartyOther')
      ) {
        continue;
      }

      if (moduleSpecifier.startsWith('.')) {
        // --- Relative import: check if it should use an alias ---

        // Check fixed aliases first (exact resolvedModulePath match)
        const { resolvedModulePath } = importEntry;
        let matchedAliasName: string | undefined;
        let matchedAliasSymbol: string | undefined;
        let matchedAliasPath: string | undefined;

        if (resolvedModulePath) {
          for (const [alias, path] of Object.entries(fixedAliases)) {
            if (resolvedModulePath === path) {
              matchedAliasName = alias;
              break;
            }
          }
        }

        // Check wildcard aliases
        if (!matchedAliasName) {
          const absolutePath = resolve(
            dirname(context.filename),
            moduleSpecifier
          );
          const match = findBestWildcardAlias(absolutePath, wildcardAliases);
          if (match) {
            matchedAliasSymbol = match.symbol;
            matchedAliasPath = match.path;
          }
        }

        if (!matchedAliasName && !matchedAliasSymbol) {
          continue;
        }

        // In relative-if-descendant mode, skip if same alias as home
        if (mode === 'relative-if-descendant') {
          if (matchedAliasName) {
            // Fixed alias — always different from a wildcard home alias, so report
          } else if (
            homeAlias &&
            matchedAliasSymbol === homeAlias.symbol &&
            matchedAliasPath === homeAlias.path
          ) {
            // Same wildcard alias — relative is preferred
            continue;
          }
        }

        let newSpecifier: string;
        if (matchedAliasName) {
          newSpecifier = matchedAliasName;
        } else if (matchedAliasSymbol && matchedAliasPath) {
          newSpecifier =
            matchedAliasSymbol +
            resolve(dirname(context.filename), moduleSpecifier).slice(
              matchedAliasPath.length
            );
        } else {
          continue;
        }

        context.report({
          messageId: 'preferAlias',
          loc: getLocFromRange(context, importEntry.reportNodeRange),
          data: { alias: newSpecifier, relative: moduleSpecifier },
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
              sourceNode.source.raw.replace(moduleSpecifier, newSpecifier)
            );
          },
        });
      } else if (mode === 'relative-if-descendant') {
        // --- Alias import: check if it should be relative ---

        // Check wildcard aliases
        let matchedSymbol: string | undefined;
        let matchedPath: string | undefined;

        for (const [symbol, path] of Object.entries(wildcardAliases)) {
          if (
            moduleSpecifier.startsWith(symbol) &&
            (!matchedSymbol || path.length > (matchedPath?.length ?? 0))
          ) {
            matchedSymbol = symbol;
            matchedPath = path;
          }
        }

        // Only convert wildcard aliases that match the home alias
        if (
          matchedSymbol &&
          matchedPath &&
          homeAlias &&
          matchedSymbol === homeAlias.symbol &&
          matchedPath === homeAlias.path
        ) {
          // Compute the absolute target path and then a relative path from current file
          const targetAbsPath =
            matchedPath + moduleSpecifier.slice(matchedSymbol.length);
          let newSpecifier = relative(dirname(context.filename), targetAbsPath);
          // Ensure it starts with ./ or ../
          if (!newSpecifier.startsWith('.')) {
            newSpecifier = './' + newSpecifier;
          }

          context.report({
            messageId: 'preferRelative',
            loc: getLocFromRange(context, importEntry.reportNodeRange),
            data: { relative: newSpecifier, alias: moduleSpecifier },
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
                sourceNode.source.raw.replace(moduleSpecifier, newSpecifier)
              );
            },
          });
        }

        // Fixed aliases that match the home alias scope could also be flagged,
        // but fixed aliases are exact-match by nature — they don't have a
        // "scope" in the same way. We leave them alone.
      }
    }

    return {};
  },
});
