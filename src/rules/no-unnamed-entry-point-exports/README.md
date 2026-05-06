# import-integrity/no-unnamed-entry-point-exports

Ensures that barrel reexports in entry point files are named.

## Rule Details

This rule flags bare `export * from './x'` in entry point files. Using bare reexports like this in entry point files have a number of drawbacks, including:

- It makes the package's public API harder to reason about, since the set of exported names is not visible at the entry point itself.
- It makes it easy to accidentally leak exports intended to be internal to the package, because every export from the reexported module becomes part of the public API.
- Parts of a barrel export that are not used by other packages are not flagged by [no-unused-package-exports](../no-unused-package-exports/README.md). See the [main README](../../../README.md) for more information on this limitation.

Named barrel reexports (`export * as foo from './x'`) and explicit named reexports (`export { foo } from './x'`) are both fine.

Examples of _incorrect_ code, with `index.ts` configured in `entryPointFiles`

```js
/*
.
├── index.ts
└── internal.ts

entryPointFiles: { '.': './index.ts' }
*/

// internal.ts
export const publicThing = 10;
export const internalThing = 20;

// index.ts
export * from './internal';
```

Examples of _correct_ code

```js
/*
.
├── index.ts
└── internal.ts

entryPointFiles: { '.': './index.ts' }
*/

// internal.ts
export const publicThing = 10;
export const internalThing = 20;

// index.ts
export * as internal from './internal';
```

```js
// index.ts
export { publicThing } from './internal';
```
