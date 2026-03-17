# fast-import/prefer-alias-imports

Enforces the use of alias imports instead of relative paths when an alias is available, and optionally enforces relative imports for sufficiently local files under the same alias.

## Rule Details

When a project configures import aliases (e.g. `@/*` mapping to `src/*`), it can be inconsistent whether developers use relative paths or alias paths for imports. This rule enforces a consistent style.

In `relative-if-local` mode (default), the rule enforces that:

- Imports between files under the **same** wildcard alias use **relative** paths only when they share at least `minSharedPathDepth` path segments within that alias
- Imports between files under **different** alias scopes, from outside an alias scope, or that are not local enough use **alias** paths

With the default `minSharedPathDepth: 1`, a single alias like `@/* -> src/*` prefers relative imports within the same top-level folder, while imports across top-level folders still use the alias.

In `always` mode, the rule enforces that all relative imports that could use an alias should use one, regardless of whether the source and target files share the same alias scope.

Examples of _incorrect_ code with mode = relative-if-local (default)

```js
/*
.
├── package.json
└── src
    ├── components
    │   └── Button.ts
    |   └── Card.ts
    └── utils
        └── helper.ts

alias: { '@/*': 'src/*' }
*/

// src/components/Card.ts

// Wrong: uses alias for a local file in the same top-level folder
import { Button } from '@/components/Button';
// Wrong: uses a relative path across top-level folders
import { helper } from '../utils/helper';
```

Examples of _correct_ code with mode = relative-if-local (default)

```js
// src/components/Card.ts

// Correct: uses a relative path for a local file in the same top-level folder
import { Button } from './Button';
// Correct: uses an alias path across top-level folders
import { helper } from '@/utils/helper';
```

Examples of _incorrect_ code with mode = always

```js
/*
.
├── package.json
└── src
    ├── components
    │   └── Button.ts
    |   └── Card.ts
    └── utils
        └── helper.ts

alias: { '@/*': 'src/*' }
*/

// src/components/Card.ts

// Wrong: uses relative path when an alias is available
import { Button } from './Button';
import { helper } from '../utils/helper';
```

Examples of _correct_ code with mode = always

```js
// src/components/Card.ts

// Correct: uses alias path
import { Button } from '@/components/Button';
import { helper } from '@/utils/helper';
```

## Options

This rule takes an options object with the following properties:

- `mode` - When set to `relative-if-local`, imports between files that are local enough within the same wildcard alias use relative paths, and other imports use alias paths. When set to `always`, all imports that can use an alias must use one. Defaults to `relative-if-local`
- `minSharedPathDepth` - The minimum number of shared path segments, counted from the wildcard alias root using resolved absolute file paths, required before `relative-if-local` prefers a relative import. Defaults to `1`
