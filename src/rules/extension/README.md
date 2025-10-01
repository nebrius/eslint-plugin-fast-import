# fast-import/consistent-file-extensions

Ensures that first party imports always or never include file extensions in import specifiers.

## Rule Details

`consistent-file-extensions` ensure that first party imports always or never include file extensions in import specifiers, e.g. `import 'foo'` or `import 'foo.js'`. The `mode` option This rule is useful when file extension inclusion/exclusion is not enforced by `tsconfig.json`/etc. (e.g. when moduleResolution is set to 'bundler'), but down-stream consumers require/disallow file extensions.

Additionally, if `forceTsExtension` is set to true, mode is set to `always`, and `allowImportingTsExtensions` is enabled in `tsconfig.json`, then the rule will ensure that first party imports of TypeScript files use TypeScript extensions, e.g. `import 'foo.ts'` or `import 'foo.cts'`. By default, when `allowImportingTsExtensions` is true, TypeScript allows `.ts` extensions, but still allows `.js` extensions too for compatibility reasons. This option forces the use of TypeScript extensions for all TypeScript files.

Examples of _incorrect_ code with mode = always

```js
/*
.
├── package.json
├── a.ts
└── b.ts
*/

// a.ts
import { b } from './b';

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

// a.ts
import { b } from './b.js';

// b.ts
export const b = 10;
```

## Options

This rule takes an options object with the following property:

- `mode` - When set to `always`, imports must always include file extensions. When set to `never`, imports must never include file extensions. Defaults to `always`
- `forceTsExtension` - When set to `true`, imports of TypeScript files must use TypeScript extensions. Defaults to `false`, and errors when `mode` is set to `never`
