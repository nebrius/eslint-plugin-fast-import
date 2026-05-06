# import-integrity/no-empty-entry-points

Flags entry point and externally imported files that have no exports.

## Rule Details

The configuration entries `entryPointFiles` and `externallyImportedFiles` settings tell Import Integrity which files have exports that are imported by other packages or frameworks. If a file matched by either setting has no exports at all, then the configuration is almost certainly wrong. This can happen when a file is modified to remove exports, or is accidentally added to the list (AI is notorious for adding files it shouldn't).

This rule reports any file matched by `entryPointFiles` or `externallyImportedFiles` that has no exports, no barrel reexports, and no single reexports. Note: files matching `/*.config*`, which are automatically set as `externallyImportedFiles`, are excluded from this rule.

Examples of _incorrect_ code, with `index.ts` configured in `entryPointFiles`

```js
/*
.
└── index.ts

entryPointFiles: { '.': './index.ts' }
*/

// index.ts
console.log('I have no exports');
```

Examples of _correct_ code

```js
/*
.
├── index.ts
└── internal.ts

entryPointFiles: { '.': './index.ts' }
*/
// index.ts
export const foo = 10;
```

```js
/*
.
├── index.ts
└── internal.ts

entryPointFiles: { '.': './index.ts' }
*/

// internal.ts
export const publicThing = 10;

// index.ts
export { publicThing } from './internal';
```
