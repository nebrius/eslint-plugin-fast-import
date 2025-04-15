# fast-import/no-entry-point-imports

Ensures that exports in entry point exports are not imported.

## Rule Details

Entry point exports are by definition the entry to an entire code base. As such, these files tend to "import the world," as it were. Given that these are the starting points for apps, they should not be imported by code further inside the code base. Not only does importing entry points indicate poor organization of code, it also runs the risk of significantly bloating bundle sizes in multi-page applications.

Examples of _incorrect_ code, with the `entryPoint` export in file `a.ts` marked as an entry point

```js
/*
.
├── a.ts
└── b.ts
*/

// a.ts
export const a = 10;
export const entryPoint = 10;

// b.ts
import { entryPoint } from './a';
```

Examples of _correct_ code

```js
/*
.
├── a.ts
└── b.ts
*/

// a.ts
export const a = 10;
export const entryPoint = 10;

// b.ts
import { a } from './a';
```
