# fast-import/no-unused-exports

Ensures exports are imported elsewhere in the package.

## Rule Details

`no-unused-exports` looks at all exports and analyzes who imports the export, if any. An export is considered used if the export is [in an entry point file or externally imported file](../../../README.md#externallyimportedfiles--entrypointfiles) or the export is imported by another file in the package.

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
import { a } from './a';
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
import type { Foo } from '../a';
```

## Limitations

### .d.ts exports

Exports listed in `.d.ts` files are not checked. This behavior is desired when `.d.ts` files declare ambient types, aka types for third party modules. However, if a `.d.ts` file is a) used to declare types for a neighboring `.js` file and b) exports types not present in the `.js` file, then these exports are not checked for usage.

### Barrel imports

If an export is later imported as a barrel import, then this rule may report a false negative and claim the export is being used when it is not. This happens because an export in a barrel object may not be referenced, but the object containing that export by definition _is_ referenced. Take the following example:

```js
// a.ts
export const a1 = 10;
export const a2 = 10;

// b.ts
import * as a from './a';
console.log(a.a1);
```

In this example, `a2` is not actually used, but we can't determine this concretely. While this specific example is simple, we can imagine more complicated cases where `a` might be passed to other functions and only referenced (or not) in other files.
