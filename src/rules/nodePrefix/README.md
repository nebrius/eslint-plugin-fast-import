# fast-import/require-node-prefix

Requires that Node.js imports are prefixed with `node:`

## Rule Details

Node.js imports can be referenced as either `<module-name>` or `node:<module-name>`. Using the latter form improves code readability, and enables other lint rules such as [eslint-plugin-simple-import-sort](https://github.com/lydell/eslint-plugin-simple-import-sort) to properly sort built-in imports separately from third party imports.

Examples of _incorrect_ code

```js
import { readFile } from 'fs/promises';
```

Examples of _correct_ code

```js
import { readFile } from 'node:fs/promises';
```
