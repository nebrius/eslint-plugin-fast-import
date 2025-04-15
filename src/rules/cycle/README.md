# fast-import/no-cycle

Ensures that there are no cycles in imports/reexports.

## Rule Details

A cycle can occur when file A imports file B, which imports file C, which imports file A. Sometimes this pattern works just fine, but sometimes it can cause severe yet inscrutible bugs. For exmaple, this type of cycle can lead to imports being `undefined` unexpectedly, even if that export is defined as `export const foo = a * 10;` and appears as if it would be impossible to be `undefined`. I've had exactly this bug take down an entire server before.

It's also very difficult to reason about the safety of a given cycle, so it's safer to just prevent all cycles.

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
