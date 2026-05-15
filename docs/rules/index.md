---
title: Rules
description: Reference documentation for Import Integrity lint rules.
outline: deep
---

# Rules

Import Integrity rules are grouped by the kind of import/export issue they detect.

| Badge | Meaning                                           |
| ----- | ------------------------------------------------- |
| ☑️    | Enabled by the recommended configuration          |
| 🧰    | Enabled by the monorepo recommended configuration |
| 🔧    | Automatically fixable with `--fix`                |

## Correctness

These rules detect dead code, unresolvable imports, and other forms of broken or unused import/export relationships.

| Rule                                                                       | Recommended | Fixable |
| -------------------------------------------------------------------------- | ----------- | ------- |
| [import-integrity/no-cycle](./no-cycle/)                                   | ☑️          |         |
| [import-integrity/no-unused-exports](./no-unused-exports/)                 | ☑️          |         |
| [import-integrity/no-unused-package-exports](./no-unused-package-exports/) | 🧰          |         |
| [import-integrity/no-unresolved-imports](./no-unresolved-imports/)         | ☑️          |         |

## Boundaries

These rules enforce boundaries between different parts of your codebase.

| Rule                                                                      | Recommended | Fixable |
| ------------------------------------------------------------------------- | ----------- | ------- |
| [import-integrity/no-test-only-imports](./no-test-only-imports/)          | ☑️          |         |
| [import-integrity/no-test-imports-in-prod](./no-test-imports-in-prod/)    | ☑️          |         |
| [import-integrity/no-restricted-imports](./no-restricted-imports/) \*     |             |         |
| [import-integrity/no-node-builtins](./no-node-builtins/) \*\*             |             |         |

\* `no-restricted-imports` requires rule-specific options, so it isn't enabled by default.
\*\* `no-node-builtins` is intended for non-Node.js environments (browsers, edge compute, etc.); it shouldn't be enabled in Node.js projects.

## Aesthetics

These rules govern the stylistic preferences for imports.

| Rule                                                             | Recommended | Fixable |
| ---------------------------------------------------------------- | ----------- | ------- |
| [import-integrity/prefer-alias-imports](./prefer-alias-imports/) | ☑️          | 🔧      |
| [import-integrity/require-node-prefix](./require-node-prefix/)   | ☑️          | 🔧      |

## Footguns

These rules prevent import/export patterns that are prone to easy-to-miss problems.

| Rule                                                                                 | Recommended | Fixable |
| ------------------------------------------------------------------------------------ | ----------- | ------- |
| [import-integrity/no-empty-entry-points](./no-empty-entry-points/)                   | ☑️          |         |
| [import-integrity/no-entry-point-imports](./no-entry-point-imports/)                 | ☑️          |         |
| [import-integrity/no-external-barrel-reexports](./no-external-barrel-reexports/)     | ☑️          |         |
| [import-integrity/no-named-as-default](./no-named-as-default/)                       | ☑️          |         |
| [import-integrity/no-unnamed-entry-point-exports](./no-unnamed-entry-point-exports/) | ☑️          |         |

