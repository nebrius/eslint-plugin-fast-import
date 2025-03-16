# esm-lint

TODO: make sure to mention that this won't resolve fully and will cause false positives:

```ts
// foo.ts
import { join } from './bar';

// bar.ts
export * from 'node:path';
```

TODO: create lint rule preventing the above