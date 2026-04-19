# fast-import/no-external-barrel-reexports

Ensures that code does not barrel reexport built-in or third party modules. Barrel reexporting is unnecessary and can make code harder to read. In addition, this rule prevents a known edge case from slipping through the cracks of [the no-unresolved-imports rule](../no-unresolved-imports/README.md#limitations).

## Rule Details

Examples of _incorrect_ code

```js
/*
.
└── a.ts
*/

// package.json
{
  "dependencies": {
    "react": "^19.0.0"
  }
}

// a.ts
export * from 'node:path';
export * from 'react';
```
