# @fast-import/no-cycle

Ensures that there are no cycles in imports/reexports

## Rule Details

Examples of _incorrect_ code

```js
/*
.
├── a.ts
├── b.ts
└── c.ts
*/

// a.ts
import { b } from './b';
export const a = 10;

// b.ts
import { c } from './c';
export const b = 10;

// c.ts
import { a } from './a';
export const c = 10;
```
