---
title: Limitations
description: Known limitations and intentionally unsupported patterns.
outline: deep
---

# Limitations

## All first party code must live inside `packageRootDir`

If files exist outside of `packageRootDir` and are imported by files inside of `packageRootDir`, then these imports will be marked as third party imports. However, since these files are not listed as a dependency in `package.json`, they will be flagged by the [no-unresolved-imports](../rules/no-unresolved-imports/) rule.

## CommonJS is not supported

If your code base mixes CommonJS and ESM, then this plugin will report any imports of CommonJS exports as invalid imports. If you use mixed CommonJS/ESM or CommonJS only, then you should not use this plugin.

## Barrel exporting from third-party/built-in modules are ignored

Import Integrity disables all checks on barrel imports from third party/builtin modules. For example, if you do this:

```js
// a.ts
export * from 'node:path';

// b.ts
import { fake } from './a';
```

Import Integrity will not flag this as an error. This level of indirection is discouraged anyways, and is why Import Integrity ships with the [no-external-barrel-reexports](../rules/no-external-barrel-reexports/) rule.

For more details, see the limitations section of [no-unresolved-imports](../rules/no-unresolved-imports/#limitations).

## Non-named barrel export entry points are not considered in external dependency tracking

If you have a barrel export without `* as foo`, then the entry point of that barrel export is not considered when analyzing cross-package imports. For example:

```js
// package-one/a.ts
export * from 'some-package';

// package-two/b.ts
import { something } from 'package-one/a';
```

Import Integrity will not know about the second import. This means that rules such as [no-unused-package-exports](../rules/no-unused-package-exports/) will not flag that this export is unused if package two stops importing it.

Import Integrity includes the [no-unnamed-entry-point-exports](../rules/no-unnamed-entry-point-exports/) rule that addresses this limitation.

## Case insensitivity inconsistency in ESLint arguments

If you pass a file pattern or path to ESLint, ESLint inconsistently applies case insensitivity. For example, let's say you have a file at `src/someFile.ts`, and you run ESLint with `eslint src/somefile.ts`. ESLint will parse the file, but it reports the filename internally as `src/somefile.ts`, not `src/someFile.ts`. However, Import Integrity will only be aware of the file at `src/someFile.ts`.

## Entrypoint file patterns with more than one wildcard are not supported

According to the Node.js spec, it's legal to define an export like:

```json
{
  "exports": {
    "./utils/*": "./src/*/utils/*/something/*.ts"
  }
}
```

In this case, the single \* from the subpath gets repeated in the file path.
