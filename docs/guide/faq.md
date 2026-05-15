---
title: FAQ and caveats
description: Frequently asked questions and known limitations for Import Integrity.
outline: deep
---

# FAQ and caveats

## Frequently Asked Questions

### Is Import Integrity a replacement for eslint-plugin-import / eslint-plugin-import-x?

No, not for the most part. Import Integrity replaces a few select rules from `eslint-plugin-import` and `eslint-plugin-import-x` that are known to be slow, such as `no-cycle`, but otherwise strives to coexist with these packages. It is recommended that you continue to use rules these packages provide that Import Integrity does not.

### Does Import Integrity support CommonJS?

No. If your codebase mixes CommonJS and ESM, Import Integrity will report any imports of CommonJS exports as invalid imports. If you use mixed CommonJS/ESM or CommonJS only, you should not use this plugin.

### Does Import Integrity support user-supplied resolvers like eslint-plugin-import does?

No, by design. Off-the-shelf resolvers work by reading the filesystem to see what files are available, which is inherently slow. By contrast, Import Integrity uses its own resolution algorithm that reuses information already in memory so that it never has to touch the filesystem. This resolution algorithm is one of the key reasons Import Integrity is able to achieve the performance it does.

If Import Integrity's resolution algorithm does not support your use case, please file an issue and I'll try to add support for it.

For more information, see [Phase 2: Module specifier resolution](./how-it-works.html#phase-2-module-specifier-resolution).

## Caveats

### All first-party code must live inside `packageRootDir`

If files exist outside of `packageRootDir` and are imported by files inside it, those imports are marked as third-party imports. Since these files aren't listed as dependencies in `package.json`, they get flagged by the [no-unresolved-imports](../rules/no-unresolved-imports/) rule.

### Barrel exports from third-party and built-in modules are ignored

Import Integrity disables all checks on barrel imports from third-party and built-in modules. For example:

```js
// a.ts
export * from 'node:path';

// b.ts
import { fake } from './a';
```

Import Integrity will not flag this as an error. This level of indirection is discouraged anyway, which is why Import Integrity ships with the [no-external-barrel-reexports](../rules/no-external-barrel-reexports/) rule.

For more details, see the limitations section of [no-unresolved-imports](../rules/no-unresolved-imports/#limitations).

### Non-named barrel export entry points are not tracked

If a barrel export doesn't use `* as foo`, the entry point of that barrel export isn't considered when analyzing cross-package imports. For example:

```js
// package-one/a.ts
export * from 'some-package';

// package-two/b.ts
import { something } from 'package-one/a';
```

Import Integrity won't see the second import. This means rules like [no-unused-package-exports](../rules/no-unused-package-exports/) won't flag this export as unused even if package-two stops importing it.

The [no-unnamed-entry-point-exports](../rules/no-unnamed-entry-point-exports/) rule addresses this caveat.

### ESLint inconsistently applies case sensitivity to file paths

If you pass a file pattern or path to ESLint, ESLint applies case insensitivity inconsistently. For example, given a file at `src/someFile.ts`, running `eslint src/somefile.ts` causes ESLint to parse the file but report the filename internally as `src/somefile.ts`. Import Integrity, however, only knows about the file at `src/someFile.ts`, which can lead to import resolution mismatches.

### Entry-point patterns with multiple wildcards are not supported

According to the Node.js spec, it's legal to define an export pattern with multiple wildcards:

```json
{
  "exports": {
    "./utils/*": "./src/*/utils/*/something/*.ts"
  }
}
```

In this case, the single `*` from the subpath repeats in the file path. Import Integrity doesn't currently support this pattern.