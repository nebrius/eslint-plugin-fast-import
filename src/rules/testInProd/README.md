# @fast-import/no-test-imports-in-prod

Ensures that production code does not import test code.

## Rule Details

`no-test-imports-in-prod` checks all imports in non-test code to ensure that test code is not imported. A file is considered a test file if it lives inside a folder named `__test__` or contains `.test.` in it's filename.

Examples of _incorrect_ code

```js
/*
.
├── a.ts
└── __test__/
    └── b.ts
*/

// a.ts
import { b } from './__test__/b.ts';

// __test__/b.ts
export const b = 10;
```

Examples of _correct_ code

```js
/*
.
├── a.ts
└── __test__/
    └── b.ts
*/

// a.ts
// no code

// __test__/b.ts
export const b = 10;
```
