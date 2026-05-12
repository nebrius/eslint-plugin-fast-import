---
title: Comparisons
description: Performance and accuracy comparisons with eslint-plugin-import and eslint-plugin-import-x.
outline: deep
---

# Comparisons to other plugins

This page compares Import Integrity against other tools that overlap with parts of its functionality:

- **[`eslint-plugin-import`](https://github.com/import-js/eslint-plugin-import)** is the oldest and most widely-used ESLint plugin for import/export linting. It covers a broad set of rules around imports, exports, and module resolution.
- **[`eslint-plugin-import-x`](https://github.com/un-ts/eslint-plugin-import-x)** is a fork of `eslint-plugin-import` that's faster and uses more modern internals. It inherits most of the rule set and the same overall design.
- **[Oxlint](https://oxc.rs/docs/guide/usage/linter)** is a Rust-based linter from the Oxc project. Its built-in rule set is more limited than ESLint's ecosystem but runs much faster.

## Feature comparison

| Capability | Import Integrity | eslint-plugin-import | eslint-plugin-import-x | ESLint built-ins | Oxlint built-ins |
| --- | --- | --- | --- | --- | --- |
| Detects unused exports | ✓ | ✓ | ✓ |  |  |
| Detects unused exports across monorepo packages | ✓ |  |  |  |  |
| Detects circular imports | ✓ | ✓ | ✓ |  | ✓ |
| Enforces test/prod separation | ✓ |  |  |  |  |
| Enforces user-defined import boundaries | ✓ | ✓ | ✓ | _partial_ |  |
| Catches common entry-point and export mistakes | ✓ | _partial_ | _partial_ |  |  |
| Resolver included; no plugin to configure | ✓ |  |  |  | ✓ |
| Monorepo-aware analysis across packages | ✓ |  |  |  |  |

The matrix shows where each tool's capabilities overlap. A few rows warrant more detail.

**User-defined import boundaries.** Both Import Integrity and `eslint-plugin-import`'s `no-restricted-paths` are resolution-aware: aliases and relative paths to the same file are treated as equivalent (ESLint's built-in `no-restricted-imports` is not). The two differ in setup: `eslint-plugin-import` works without a resolver, but struggles to reliably catch what you expect unless you choose, install, and configure the right resolver plugin for your codebase. Import Integrity ships its own out of the box. [How it works](./how-it-works.md) covers the resolver in detail.

`eslint-plugin-boundaries` takes a different approach to this problem space: users define element types, tag files via patterns, and declare a dependency matrix between types. Files that aren't tagged are skipped or flagged as errors, depending on configuration.

**Entry-point and barrel mistakes.** `eslint-plugin-import` and `eslint-plugin-import-x` cover pieces of this category (`no-named-as-default` and a few related rules), but not broader entry-point validation. Import Integrity adds rules for empty entry points, imports between entry points, and other subtle export mistakes that don't show up until something breaks.

# Comparisons to import and import-x

Below are performance and accuracy comparisons to [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) and [eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x).

## Performance

To compare performance of this plugin vs the other plugins, I forked the VS Code codebase. VS Code is a large codebase with the following stats as of this writing:

- 5,299 files
- 1,255,760 lines of code, excluding blank lines and comments (according to [cloc](https://github.com/AlDanial/cloc))
- 88,623 imports
- 17,477 exports
- 184 reexports

Here are the results for three commonly expensive rules that flag unused exports, import cycles, and unresolved imports:

<img src="https://github.com/nebrius/import-integrity-lint/raw/main/perf.png" alt="Performance comparison of three import plugins" width="700"/>

And here's the raw data:

|                  | No Unused  | No Cycle   | No Unresolved | Total      |
| ---------------- | ---------- | ---------- | ------------- | ---------- |
| Import Integrity | 55.6ms     | 1,880.6ms  | 15.2ms        | 1,936.2ms  |
| Import           | 25,903.8ms | 42,710.7ms | 399.1ms       | 68,614.5ms |
| Import X         | 36,200.9ms | 16,931.7ms | 821.6ms       | 53,132.5ms |

If you would like to see details of how this data was computed, see the [script I wrote in my fork of VS Code](https://github.com/nebrius/vscode/blob/import-integrity-perf/compare.ts).

Fun fact: Import Integrity was originally written using [TypeScript ESLint's parser](https://www.npmjs.com/package/@typescript-eslint/parser) instead of Oxc, which you can see [here](https://github.com/nebrius/import-integrity-lint/blob/4dde22b599db22dbb7421bf094edb48dddf6bb6b/src/module/computeBaseFileDetails.ts). That version of Import Integrity took about 12 seconds to lint VS Code, which is still considerably faster than the others. The performance improvement of this plugin is split almost exactly 50/50 between the switch to Oxc and the [algorithm described here](./how-it-works). Rust helped, as expected, but a faster algorithm helped _just as much._

## Accuracy

The performance script I wrote above also counts the number of errors found. Before I present the results, I want to emphasize that these are _not_ issues in VS Code! I intentionally configured ESLint to check test files, and VS Code includes test files with intentional errors so that they can make sure VS Code handles errors correctly. Now on to the errors:

|                  | Unused | Cycle | Unresolved |
| ---------------- | ------ | ----- | ---------- |
| Import Integrity | 4,672  | 686   | 306        |
| Import           | 4,500  | 600   | 29         |
| Import X         | 4,521  | 600   | 49         |

We notice that the numbers are pretty close to each other, with Import Integrity reporting a few more. While I haven't looked at each error to determine precisely what's going on, I'm pretty certain it's due to:

- Import Integrity flagging non-test exports as unused if they are only imported in test files, which the other two don't check
- Import Integrity flagging imports of third party modules that are not listed in package.json (aka transient imports) as unresolved

I do find it interesting that Import Integrity finds a few more cycles. The 600 number is oddly round though, so perhaps their cycle detection algorithm has a limit on how many cycles it reports.

Details aside, we can safely say that all three libraries have about the same level of accuracy.
