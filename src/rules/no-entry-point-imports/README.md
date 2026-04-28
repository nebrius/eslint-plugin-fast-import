# fast-import/no-entry-point-imports

Ensures that exports from entry point files are not imported.

## Rule Details

Files matched by `entryPointFiles` or `externallyImportedFiles` are treated as package entry points. Because these files typically sit at the top of the dependency graph and often import large parts of the package, code inside the package should not import them. Doing so makes imports harder to reason about, often leads to circular dependencies, and contributes to bundle bloat

All exports from a file matched by `entryPointFiles` or `externallyImportedFiles` are treated as entry point exports. Note: dynamic imports are not counted for this rule, since their dynamic nature means they won't contribute to bundle bloat and can't cause deadlocks in circular dependencies the same way static imports do.

Examples of _incorrect_ code, with `a.ts` configured in `entryPointFiles`

```js
/*
.
├── a.ts
├── b.ts
└── c.ts

entryPointFiles: { '.': './a.ts' }
*/

// a.ts
export const publicApi = 10;

// c.ts
export const internalValue = 20;

// b.ts
import { publicApi } from './a';
```

Examples of _correct_ code

```js
/*
.
├── a.ts
├── b.ts
└── c.ts

entryPointFiles: { '.': './a.ts' }
*/

// a.ts
export const publicApi = 10;

// c.ts
export const internalValue = 20;

// b.ts
import { internalValue } from './c';
```
