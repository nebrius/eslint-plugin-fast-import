# fast-import/prefer-alias-imports

Enforces the use of alias imports instead of relative paths when an alias is available, and optionally enforces relative imports for files under the same alias.

## Rule Details

When a project configures import aliases (e.g. `@/*` mapping to `src/*`), it can be inconsistent whether developers use relative paths or alias paths for imports. This rule enforces a consistent style.

In `relative-if-descendant` mode (default), the rule enforces that:

- Imports between files under the **same** alias scope use **relative** paths
- Imports between files under **different** alias scopes (or from outside an alias scope) use **alias** paths

In `always` mode, the rule enforces that all relative imports that could use an alias should use one, regardless of whether the source and target files share the same alias scope.

Examples of _incorrect_ code with mode = relative-if-descendant (default)

```js
/*
.
├── package.json
└── src
    ├── components
    │   └── Button.ts
    └── utils
        └── helper.ts

alias: { '@/*': 'src/*' }
*/

// src/components/Button.ts

// Wrong: uses alias for file under the same alias scope
import { helper } from '@/utils/helper';
```

Examples of _correct_ code with mode = relative-if-descendant (default)

```js
// src/components/Button.ts

// Correct: uses relative path for file under the same alias scope
import { helper } from '../utils/helper';
```

Examples of _incorrect_ code with mode = always

```js
/*
.
├── package.json
└── src
    ├── components
    │   └── Button.ts
    └── utils
        └── helper.ts

alias: { '@/*': 'src/*' }
*/

// src/components/Button.ts

// Wrong: uses relative path when an alias is available
import { helper } from '../utils/helper';
```

Examples of _correct_ code with mode = always

```js
// src/components/Button.ts

// Correct: uses alias path
import { helper } from '@/utils/helper';
```

## Options

This rule takes an options object with the following property:

- `mode` - When set to `relative-if-descendant`, imports between files under the same alias use relative paths, and imports across alias boundaries use alias paths. When set to `always`, all imports that can use an alias must use one. Defaults to `relative-if-descendant`
