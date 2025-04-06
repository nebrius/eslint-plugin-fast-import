# eslint-plugin-fast-esm

TODO: make sure to mention that this won't resolve fully and will cause false positives:

```ts
// foo.ts
import { join } from './bar';

// bar.ts
export * from 'node:path';
```

TODO: create lint rule preventing the above

TODO: mention case-sensitive weirdness when specifying file patterns to CLI, e.g. it works as case insensitive, but also doesn't
