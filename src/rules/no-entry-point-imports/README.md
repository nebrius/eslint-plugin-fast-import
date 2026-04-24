# fast-import/no-entry-point-imports

Ensures that exports from entry point files are not imported.

## Rule Details

Files matched by `entryPointFiles` or `externallyImportedFiles` are treated as package entry points. Because these files typically sit at the top of the dependency graph and often import large parts of the package, code inside the package should not import them.

All exports from a file matched by `entryPointFiles` or `externallyImportedFiles` are treated as entry point exports.

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
