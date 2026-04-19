# fast-import/no-node-builtins

Disallows imports of Node.js built-in modules.

## Rule Details

This rule flags any import of a Node.js built-in module such as `fs`, `path`, `node:fs`, etc. This is useful for codebases that need to run in non-Node.js environments (browsers, edge runtimes, etc.) where Node.js built-ins are not available.

Examples of _incorrect_ code

```js
import fs from 'node:fs';
import { join } from 'path';
import * as crypto from 'node:crypto';
export { readFile } from 'node:fs/promises';
```

Examples of _correct_ code

```js
import { something } from './myModule';
import lodash from 'lodash';
```
