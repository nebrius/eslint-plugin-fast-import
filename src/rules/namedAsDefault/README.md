# fast-import/no-named-as-default

Ensures that default imports do not have the same name as a named export in the file being imported from

## Rule Details

If someone names a default import the same as a named export in the file being imported from, the developer likely made a mistake and is trying to import the named export. If, on the other hand, the developer _is_ trying to import the default export, then the using this name can be confusing.

Given:

```ts
// a.ts
export const a = 10;
export default 20;
```

Examples of _incorrect_ code:

```ts
// b.ts
import a from './a';
```

Examples of _correct_ code:

```ts
// b.ts
import aDefault from './a';
```
