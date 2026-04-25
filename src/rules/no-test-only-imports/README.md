# fast-import/no-test-only-imports

Ensures that non-test files exports are imported by other non-test files.

## Rule Details

The primary use case for flagging unused exports is to identify and remove dead code. However, if this export used to be used in production code but a refactor removed the last production usage of the export, a test that imports this export would create a false negative and not identify the dead code. This rule prevents that from happening.

It's also generally considered best practice for tests to not import internal implementation details, and to only test public API surfaces. These test-only exports will get flagged, and can be a call to action to refactor the code to be more testable.

Type exports are an exception though because they can help surface issues in tests. As such, they are not flagged by this rule. If you do need to export something specifically for tests, such as a test reset helper, prefix it with an underscore (`_`).

`no-test-only-imports` looks at all exports and analyzes who imports the export, if any. An export is flagged by this rule if none of the following are true:

1. The export is [in an entry point file or externally imported file](../../../README.md#externallyimportedfiles--entrypointfiles)
2. The export is in a non-test file and is imported by another non-test file
3. The export is in a non-test file, is prefixed with (`_testOnly`), and is imported by a test file
4. The export is in a test file and is imported by another file
5. The export is a type export and is imported in a test _or_ non-test file

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

Exports listed in `.d.ts` files are not checked. This behavior is desired when `.d.ts` files declare ambient types, aka types for third party modules. However, if a `.d.ts` file is used to declare types for a neighboring `.js` file and exports types not present in the `.js` file, then these exports are not checked for usage.

### Barrel imports

If an export is later imported as a barrel import, then this rule will not flag if that export is unused or not. This happens because an export in a barrel object may not be referenced, but the object containing that export by definition _is_ referenced. Take the following example:

```js
// a.ts
export const a1 = 10;
export const a2 = 10;

// b.ts
import * as a from './a';
console.log(a.a1);
```

In this example, `a2` is not actually used, but we can't determine this concretely. While this specific example is simple, we can imagine more complicated cases where `a` might be passed to other functions and only referenced (or not) in other files.
