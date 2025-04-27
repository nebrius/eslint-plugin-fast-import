# fast-import/no-external-barrel-reexports

Ensures that code does not barrel reexport builtin or third party modules. Barrel reexporting is unecessary and can make code harder to read. In addition, this rule prevents a known edge case from slipping through the cracks of [the no unresolved imports rule](../unresolved#limitations).

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
