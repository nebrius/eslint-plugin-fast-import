# import-integrity/no-external-barrel-reexports

Ensures that code does not barrel reexport external modules.

## Rule Details

In this rule, "external" means third-party packages and Node.js built-in modules. Barrel reexporting external code (e.g. `export * from 'react'` or `export * from 'node:path'`) is rarely necessary and can make code harder to read by obscuring which symbols a file is actually exposing.

This rule also closes an edge case in the [`no-unresolved-imports`](../no-unresolved-imports#limitations) rule. Without it, downstream consumers can import unresolvable symbols through a barrel reexport without `no-unresolved-imports` catching them.

Barrel reexporting from first-party files within your package (`export * from './internal'`) is allowed.

## Examples

### Incorrect

```js
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

### Correct

```js
// package.json
{
  "dependencies": {
    "react": "^19.0.0"
  }
}

// a.ts
export { join, resolve } from 'node:path';
export { useState, useEffect } from 'react';
```

Named reexports work fine. Only the barrel form (`export *`) is flagged.

## Configuration

### Options

This rule has no options.

### When not to use this rule

We don't recommend disabling this rule. If you have a legitimate need to barrel reexport an external module, consider whether the consumers would be better served by importing from the source directly.