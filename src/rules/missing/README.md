# @fast-import/no-missing-exports

Ensures that module specifiers in import statements, aka `foo` in `import { bar } from 'foo'`, resolve to known modules.

## Rule Details

`no-missing-exports` ensure that imports can be resolved to known exports. An import resolves to a known export if one of the following is true:

1. The module specifier matches a built-in Node.js module specifier, as reported by `builtinModules` in the `node:module` module.
2. The module specifier resolves to another code file.
3. The module specifier matches a module listed in `package.json`
    - When resolving, each `package.json` is inspected in folders between the file in question and a folder containing a `.git` folder, or the root folder if there is no `.git` folder

Examples of _incorrect_ code

```js
/*
.
├── package.json
├── a.ts
└── b.ts
*/

// package.json
{
  "dependencies": {
    "react": "^19.0.0"
  }
}

// a.ts
import { c } from './c';
import glob from 'glob';

// b.ts
export const b = 10;
```

Examples of _correct_ code

```js
/*
.
├── package.json
├── a.ts
└── b.ts
*/

// package.json
{
  "dependencies": {
    "react": "^19.0.0"
  }
}

// a.ts
import { useState } from 'react';
import { b } from './b';

// b.ts
export const b = 10;
```

## Limitations

Barrel exports and imports, aka `import * as foo from 'bar'`, are limited to only determining if the module specifier is valid, but does _not_ check if symbols (aka `bar` in `import { bar } from 'foo';`) are valid. For example:

```js
/*
.
├── a.ts
└── foo/
    ├── b.ts
    └── c.ts
*/

// c.ts
export const c = 10;

// b.ts
export const b = 10;
export { c } from './c';

// a.ts
import * as b from './b';
```

In this case, we can see that `b` resolves to more than one file, which already makes analysis complicated. Now let's take a more complicated scenario:


```js
/*
.
├── a.ts
└── foo/
    ├── b.ts
*/

// b.ts
export * as path from 'node:path';

// a.ts
import * as path from './b';

console.log(path.joins('a', 'b'));
```

Do you see the import bug? This code will crash, because `joins` does not exist in the `path` module. Given the level of indirection however, this rule cannot find this bug.

The [no-external-barrel-reexports]('../externalBarrelReexports/README.md) prevents barrel exports from third party and built-in modules, which mitigates this edge case.
