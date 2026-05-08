---
title: Algorithm
description: How Import Integrity analyzes imports and exports.
outline: deep
---

# Algorithm

Import Integrity works by using a four phase pipelined algorithm that is very cache friendly. Each phase is isolated from the other phases so that they can each implement a caching layer that is tuned for that specific phase.

## Phase 1: AST analysis

This phase reads in every non-ignored file inside `packageRootDir` with a known JavaScript extension (`.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`) and parses the file into an AST. In monorepos, this happens independently for each discovered package. The AST is then converted into an import/export specific form optimized for import/export analysis.

For example, the import statement `import { foo } from './bar'` gets boiled down to:

```js
{
  importAlias: 'foo',
  importName: 'foo'
  importType: 'single',
  isTypeImport: false,
  moduleSpecifier: './bar',
  statementNodeRange: [0, 27],
  reportNodeRange: [9, 12]
}
```

This phase is by far the most performance intensive of the four phases due to file reads and AST parsing, comprising over 80% of total execution time on a cold cache. At the same time, information computed for each file is completely independent of information in any other file. This correlation is exploited at the caching layer, because changes to any one file do not result in cache invalidations of any other file.

For example, this phase takes 1.26 seconds on a cold cache running on the VS Code codebase on my laptop, out of 1.52 seconds total. Subsequent file edits in the editor only take ~1ms due to the high cacheability of this phase.

Details for the information computed in this stage can be viewed in the [types file for base information](https://github.com/nebrius/import-integrity-lint/blob/main/src/types/base.ts).

## Phase 2: Module specifier resolution

This phase goes through every import/reexport entry from the first phase and resolves the module specifier. This phase is the second most performance intensive phase, taking around 15% of total execution time. On VS Code, this phase takes 0.21 seconds, out of 1.52 seconds total.

Import Integrity uses its own high-performance resolver to achieve this speed. It resolves module specifiers to one of three types in a very specific order:

1. A Node.js built-in module, as reported by `builtinModules()` in the `node:module` module
2. A file within the current `packageRootDir`, aka first party
3. A third party module

Module specifiers are resolved in this order because we already have a list of built-in modules and first party files _in memory_. By following this flow, we never have to touch the file system to do any resolving! This makes Import Integrity's resolution algorithm considerably faster than other resolvers, and is even as fast as algorithms written in Rust despite being written in JavaScript. In specific, by moving third party module resolution to the end, we can "default" to imports being third party imports and never have to look at `node_modules`.

In this phase, changes to one file may impact the information in another file. Nonetheless, determining which files is impacted is relatively straightforward. In addition, changes typically do not impact a large number of other file's caches. This means we can still use caching in this phase to measurably improve performance.

Details for the information computed in this stage can be viewed in the [types file for resolved information](https://github.com/nebrius/import-integrity-lint/blob/main/src/types/resolved.ts).

## Phase 3: Import graph analysis

This third phase traverses the import/export graph created in the second phase to determine the ultimate source of all imports/reexports. In addition, we store other useful pieces of information, such as collecting a list of every file that imports a specific export, and linking each import statement to a specific export statement.

This phase is the second least performance intensive, representing only about 3% of total run time. On the VS Code Codebase, this phase takes 48ms, out of 1.52 seconds total.

Linking imports to exports can be non-trivial, especially if there are a lot of reexports. For example:

```js
// a.ts
import b from './b'; // points to file d.ts!

// b.ts
export { default } from './c';

// c.ts
export { default } from './d';

// d.ts
export default 10; // Export for import in file a.ts!
```

As we've seen, this phase is not performance intensive due to all the heavy lifting we've done in the first two phases. It is also the most entangled and difficult to cache, as we saw in the example above. As a result, Import Integrity does not do any caching during this phase, since it has little effect on overall performance anyways.

Details for the information computed in this stage can be viewed in the [types file for analyzed information](https://github.com/nebrius/import-integrity-lint/blob/main/src/types/analyzed.ts).

## Phase 4: Monorepo analysis

This fourth phase collects the import graph analysis from each package in the monorepo to analyze cross-package imports and exports. This phase produces data similar to the third phase, except it utilizes information from the third phase to short-circuit many of its computations.

This phase is the least performance intensive, representing less than 1% of total run time. On the VS Code Codebase, this phase takes 10ms, out of 1.52 seconds total. Similar to the third phase, this phase is not easily cached, but any caching would have negligible impact on total performance.

Details for the information computed in this stage can also be viewed in the [types file for analyzed information](https://github.com/nebrius/import-integrity-lint/blob/main/src/types/analyzed.ts). Data populated by this phase have comments indicating that they are phase 4 data.
