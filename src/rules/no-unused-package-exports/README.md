# fast-import/no-unused-package-exports

Ensures entry point exports are imported by other packages in a monorepo.

## Rule Details

`no-unused-package-exports` looks at all exports in [entry point files](../../../README.md#externallyimportedfiles--entrypointfiles) and analyzes whether any other package in the monorepo imports them. An export is considered used if it is imported in at least one other package.

This rule only applies to files matched by the `entryPointFiles` setting. Files matched by `externallyImportedFiles` are not checked, because those represent files imported by a framework runtime (e.g. Next.js `page.tsx`) where Fast Import cannot see the consumer. `entryPointFiles`, by contrast, represent a package's public API intended for use by other packages in the monorepo, which Fast Import _can_ analyze.

This rule is only meaningful in a monorepo. See [Use in monorepos](../../../README.md#use-in-monorepos) for more info.

Examples of _incorrect_ code

```js
/*
.
└── packages/
    ├── one/
    │   └── entry.ts
    └── two/
        └── index.ts
*/

// packages/one/entry.ts
export const Unused = 1;

// packages/two/index.ts
// (does not import from 'one')
```

Examples of _correct_ code

```js
/*
.
└── packages/
    ├── one/
    │   └── entry.ts
    └── two/
        └── index.ts
*/

// packages/one/entry.ts
export const Used = 1;

// packages/two/index.ts
import { Used } from 'one';
```

## Options

This rule has no options.

## Limitations

### Barrel imports

If an entry point export is later imported as a barrel import from another package, then this rule will not flag if that export is referenced from the barrel import object or not. This happens because an export in a barrel object may not be referenced, but the object containing that export by definition _is_ referenced. Take the following example:

```js
// packages/one/entry.ts
export const a1 = 10;
export const a2 = 10;

// packages/two/index.ts
import * as one from 'one';
console.log(one.a1);
```

In this example, `a2` is not actually used, but we can't determine this concretely. While this specific example is simple, we can imagine more complicated cases where `one` might be passed to other functions and only referenced (or not) in other files.

### Non-named barrel reexports

A bare `export * from` reexport in an entry point file has no resolvable name and is skipped by this rule.

Additionally, when an entry point file uses a bare barrel reexport, Fast Import cannot track cross-package imports of the reexported names. For example:

```js
// packages/one/entry.ts
export * from 'some-package';

// packages/two/index.ts
import { something } from 'one';
```

Fast Import will not know about the second import. This means that this rule will not flag the export as unused if `packages/two` stops importing it.

This is a general Fast Import limitation; see the [main README](../../../README.md) for more details.
