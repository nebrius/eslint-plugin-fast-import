---
title: FAQ
description: Frequently asked questions and known limitations for Import Integrity.
outline: deep
---

# Frequently Asked Questions

## Compatibility and scope

### Is Import Integrity a replacement for eslint-plugin-import / eslint-plugin-import-x?

No, not for the most part. Import Integrity replaces a few select rules from import and import x that are known to be slow, such as `no-cycle`, but otherwise strives to coexist with these packages. It is recommended that you continue to use rules these packages provide that Import Integrity does not.

### Does Import Integrity support CommonJS?

No. If your codebase mixes CommonJS and ESM, then Import Integrity will report any imports of CommonJS exports as invalid imports. If you use mixed CommonJS/ESM or CommonJS only, then you should not use this plugin.

### Does Import Integrity support user-supplied resolvers like eslint-plugin-import does?

No, Import Integrity cannot use off the shelf resolvers, by design. Off the shelf resolvers work by reading the filesystem to see what files are available, which is inherently slow. By contrast, Import Integrity uses its own resolution algorithm that reuses information that already exists in memory so that it never has to touch the filesystem. This resolution algorithm is one of the key reasons Import Integrity is able to achieve the performance it does.

If Import Integrity's resolution algorithm does not support your use case, please file an issue and I'll try to add support for it.

For more information, see [Phase 2: Module specifier resolution](./how-it-works#phase-2-module-specifier-resolution).

## Configuration and setup

### Why are my files outside `packageRootDir` flagged as unresolved?

If files exist outside of `packageRootDir` and are imported by files inside of `packageRootDir`, then these imports will be marked as third party imports. However, since these files are not listed as a dependency in `package.json`, they will be flagged by the [no-unresolved-imports](../rules/no-unresolved-imports/) rule.

### Why does ESLint inconsistently apply case sensitivity to my file paths?

If you pass a file pattern or path to ESLint, ESLint inconsistently applies case insensitivity. For example, let's say you have a file at `src/someFile.ts`, and you run ESLint with `eslint src/somefile.ts`. ESLint will parse the file, but it reports the filename internally as `src/somefile.ts`, not `src/someFile.ts`. However, Import Integrity will only be aware of the file at `src/someFile.ts`.

### Does Import Integrity support multi-wildcard entry-point patterns?

No. According to the Node.js spec, it's legal to define an export like:

```json
{
  "exports": {
    "./utils/*": "./src/*/utils/*/something/*.ts"
  }
}
```

In this case, the single \* from the subpath gets repeated in the file path. Import Integrity does not currently support this pattern though.

## Analysis edge cases

### Does Import Integrity track barrel exports from third-party modules?

No. Import Integrity disables all checks on barrel imports from third party/builtin modules. For example, if you do this:

```js
// a.ts
export * from 'node:path';

// b.ts
import { fake } from './a';
```

Import Integrity will not flag this as an error. This level of indirection is discouraged anyways, and is why Import Integrity ships with the [no-external-barrel-reexports](../rules/no-external-barrel-reexports/) rule.

For more details, see the limitations section of [no-unresolved-imports](../rules/no-unresolved-imports/#limitations).

### Does Import Integrity track non-named barrel export entry points?

No. If you have a barrel export without `* as foo`, then the entry point of that barrel export is not considered when analyzing cross-package imports. For example:

```js
// package-one/a.ts
export * from 'some-package';

// package-two/b.ts
import { something } from 'package-one/a';
```

Import Integrity will not know about the second import. This means that rules such as [no-unused-package-exports](../rules/no-unused-package-exports/) will not flag that this export is unused if package two stops importing it.

Import Integrity includes the [no-unnamed-entry-point-exports](../rules/no-unnamed-entry-point-exports/) rule that addresses this limitation.
