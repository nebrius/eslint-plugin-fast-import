# fast-import/no-unused-exports

Ensure exports are imported elsewhere, taking into account whether files are test files or non-test files, and whether the export is a type export or value export.

## Rule Details

`no-unused-exports` looks at all exports and analyzes who imports the export, if any. An export is considered used if any of the following are true:

1. The export is [listed as an entry point](../../../README.md#entrypoints)
2. The export is a non-test file and is imported by another non-test file
3. The export is a test file (exports in test files are not analyzed by this rule)
4. The export is a type export and is imported in a test or non-test file

Types are often useful in test code, and so are not flagged as unused if imported in test by files by default unless the `allowNonTestTypeExports` rule option is disabled.

Examples of _incorrect_ code

```js
/*
.
└── a.ts
*/

// a.ts
export const a = 10;
```

```js
/*
.
├── a.ts
└── __test__/
    └── b.ts
*/

// a.ts
export const a = 10;

// __test__/b.ts
import { a } from '../a';
```

Examples of _correct_ code

```js
/*
.
└── a.ts
*/

// a.ts
const a = 10;
```

```js
/*
.
├── a.ts
└── b.ts
*/

// a.ts
export const a = 10;

// b.ts
import { b } from './b';
```

```js
/*
.
├── a.ts
└── __test__/
    └── b.ts
*/

// a.ts
export interface Foo {
  bar: string
}

// __test__/b.ts
import type { Foo } from './b';
```

## Options

This rule takes an options object with the following property:

- `allowNonTestTypeExports` - When set to `true`, type exports in non-test files are allowed to be imported in test files. Defaults to `true`

## Limitations

### .d.ts exports

Exports listed in `.d.ts` files are not checked. This behavior is desired when `.d.ts` files declair ambient types, aka types for third party modules. However, if a `.d.ts` file is used to declare types for a neighboring `.js` file and exports types not present in the `.js` file, then these exports are not checked for usage.

### Barrel imports

If an export is later imported as a barrel import, then this rule will not flag if that export is unused or not. This happens because an export in a barrel object may not be referenced, but the object containing that export by definition _is_ referenced. Take the following example:

```js
// a.ts
export const a1 = 10;
export const a2 = 10;

// b.ts
import * as a from './a';
console.log(a1);
```

In this example, `a2` is not actually used, but we can't determine this concretely. While this specific example is simple, we can imagine more complicated cases where `a` might be passed to other functions and only referenced (or not) in other files.
