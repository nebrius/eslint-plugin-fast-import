---
title: Fast Import Migration
description: Migrate from Fast Import to Import Integrity.
outline: deep
---

# Fast Import Migration

This guide covers upgrading from `eslint-plugin-fast-import` (1.x or 2.x) to `import-integrity-lint` 1.0. The package was renamed and the configuration system was rewritten. Most changes are mechanical. The target audience for this guide is AI agents performing the migration. You can use this as an AI prompt

This guide is written to be executable: each step shows the exact old code and the exact new code. Follow the steps in order.

## Step 1: Replace the package

Uninstall the old package and install the new one:

```bash
npm uninstall eslint-plugin-fast-import
npm install --save-dev import-integrity-lint
```

## Step 2: Update the import in your ESLint config

**Old:**

```js
import { recommended } from 'eslint-plugin-fast-import';
```

**New:**

```js
import importIntegrityPlugin from 'import-integrity-lint';
```

The plugin is now a default export rather than named exports of helper functions.

## Step 3: Update the config structure

The old API used a `recommended()` function that took settings as arguments and returned a config object. The new API uses a static `configs.recommended` object with settings in a separate `settings['import-integrity']` block.

**Old:**

```js
import { recommended } from 'eslint-plugin-fast-import';

export default [
  recommended({
    rootDir: import.meta.dirname,
  }),
];
```

**New:**

```js
import { defineConfig } from 'eslint/config';
import importIntegrityPlugin from 'import-integrity-lint';

export default defineConfig([
  {
    settings: {
      'import-integrity': {
        packageRootDir: import.meta.dirname,
      },
    },
  },
  importIntegrityPlugin.configs.recommended,
]);
```

Key shape changes:
- Settings now live in `settings['import-integrity']` in a separate config object
- `importIntegrityPlugin.configs.recommended` is spread as a static object, not called as a function
- `rootDir` is renamed to `packageRootDir` (see Step 4)

## Step 4: Rename `rootDir` to `packageRootDir`

Every occurrence of `rootDir` in fast-import settings becomes `packageRootDir`.

**Old:**

```js
recommended({
  rootDir: import.meta.dirname,
})
```

**New:**

```js
settings: {
  'import-integrity': {
    packageRootDir: import.meta.dirname,
  },
}
```

## Step 5: Update rule references in the ESLint config

Replace every occurrence of `fast-import/` with `import-integrity/` in rule names.

**Old:**

```js
rules: {
  'fast-import/no-cycle': 'error',
  'fast-import/no-unused-exports': 'error',
}
```

**New:**

```js
rules: {
  'import-integrity/no-cycle': 'error',
  'import-integrity/no-unused-exports': 'error',
}
```

Apply this transformation to every `fast-import/<rule-name>` reference. The rule names themselves don't change, only the namespace prefix.

Also update any ESLint disable comments in source code:

**Old:**

```js
// eslint-disable-next-line fast-import/no-cycle
```

**New:**

```js
// eslint-disable-next-line import-integrity/no-cycle
```

## Step 6: Convert `entryPoints` to `entryPointFiles`

The shape of this option changed. The old form mapped file paths to lists of exported symbols. The new form uses a `package.json` `exports`-style subpath map.

**Old:**

```js
entryPoints: {
  './src/app/**/page.tsx': ['default', 'metadata'],
  './src/index.ts': ['default'],
}
```

**New:**

```js
entryPointFiles: {
  '.': './src/index.ts',
}
```

Migration logic:
- The old `./src/app/**/page.tsx` pattern (Next.js routing) moves to `externallyImportedFiles` (see Step 7), not `entryPointFiles`. This is because Next.js routing exports are externally imported by the framework, not entry points of a public API.
- The old `./src/index.ts` library entry point becomes an entry in the new subpath map, with the subpath (typically `'.'`) as the key and the file path as the value.
- The old per-symbol filtering (the `['default', 'metadata']` array) is gone. All exports from the listed file are now treated as entry points.

If your old config used `entryPoints` for Next.js patterns specifically, you can likely remove that section entirely — Import Integrity now auto-detects Next.js and pre-applies the appropriate patterns.

## Step 7: Convert `externallyImported` to `externallyImportedFiles`

The shape of this option changed. The old form mapped file paths to lists of exported symbols (often `/.*/` to mean "all"). The new form is a flat list of gitignore-style file patterns.

**Old:**

```js
externallyImported: {
  'index.ts': /.*/,
  'src/app/**/page.tsx': /.*/,
}
```

**New:**

```js
externallyImportedFiles: [
  '/index.ts',
  '/src/app/**/page.tsx',
]
```

Migration logic:
- The keys of the old object become entries in the new array
- The regex values are dropped entirely — the new form treats all exports from listed files as externally imported
- Patterns now use gitignore syntax (leading `/` anchors to the package root)

If your old config used `externallyImported` for Next.js routing patterns, you can likely remove those entries — Import Integrity auto-detects Next.js and pre-applies them.

## Step 8: Remove `requireFileExtensions` from your config

The `consistent-file-extensions` rule was removed in 1.0. The `requireFileExtensions` shortcut option for that rule was also removed. There is no replacement.

If your old config used this option:

```js
recommended({
  rootDir: import.meta.dirname,
  requireFileExtensions: true,
})
```

Remove the `requireFileExtensions` line entirely. The rule no longer exists.

## Step 9: Handle the `no-unused-exports` split

The old `no-unused-exports` rule was split into two rules: `no-unused-exports` and `no-test-only-imports`. The recommended config now enables both, so most users don't need to do anything.

If you manually configured `no-unused-exports` to a non-default level (e.g. `'error'` outside of `recommended`), also add the same level for `no-test-only-imports`:

**Old:**

```js
rules: {
  'fast-import/no-unused-exports': 'error',
}
```

**New:**

```js
rules: {
  'import-integrity/no-unused-exports': 'error',
  'import-integrity/no-test-only-imports': 'error',
}
```

If your old config used the `allowNonTestTypeExports` option on `no-unused-exports`, there is no equivalent. Type-only exports are now always ignored by `no-test-only-imports`. Remove the option from your config.

## Step 10: Decide on `require-node-prefix`

The `require-node-prefix` rule was previously only enabled in the `all` config. In Import Integrity, it is enabled in `recommended` and may flag new errors in code that imports Node built-ins without the `node:` prefix (e.g. `import 'path'` instead of `import 'node:path'`).

If you want to keep this rule active, no action is needed — it's fixable with `--fix`.

If you want to preserve the previous default-off behavior:

```js
rules: {
  'import-integrity/require-node-prefix': 'off',
}
```

## Step 11: Custom rule helpers (only if you wrote custom rules)

If you wrote custom lint rules using Import Integrity's helper API, update the call shapes:

**`getESMInfo` return shape changed:**

| Old | New |
| --- | --- |
| `esmInfo.projectInfo` | `esmInfo.packageInfo` |
| `esmInfo.projectInfo.rootDir` | `esmInfo.packageInfo.packageRootDir` |
| `esmInfo.settings` | `esmInfo.packageSettings` |

**`isNonTestFile` signature changed:**

```js
// Old
isNonTestFile(filePath, rootDir, settings)

// New
isNonTestFile(filePath)
```

Settings are now resolved internally.

**`registerUpdateListener` callback signature changed:**

The callback now receives a per-package `packageRootDir` argument rather than nothing. In monorepos, the listener may be invoked once per package.

```js
// Old
registerUpdateListener(() => { /* ... */ });

// New
registerUpdateListener((packageRootDir) => { /* ... */ });
```

## Behavior changes to expect after upgrading

After completing the migration, lint output may differ from the old version in a few ways. These are intentional changes, not bugs.

**Cycle detection algorithm changed.** The `no-cycle` rule now uses Tarjan's strongly-connected-components algorithm. Cycle counts may differ from fast-import 2.x. Counts are now deterministic across runs (the old implementation was order-dependent and could drop cycles depending on file traversal order).

**Side-effect imports are now tracked.** Imports like `import 'foo'` (no bindings) are now considered when detecting cycles. This may surface cycles that were previously missed.

**Default ignored folders expanded.** Any folder starting with `.` is now ignored (which subsumes the previous explicit `.git` entry). The folder `out` is now also ignored by default. If you previously relied on linting code in such folders, you'll need to file an issue.

**Config files are auto-treated as externally imported.** Files matching `/*.config.*` are automatically treated as externally imported. If your old config explicitly listed these in `externallyImported`, you can remove those entries.

## Optional: features available after upgrading

These are new features in Import Integrity that you can adopt at your discretion. None are required for the migration itself.

- **Monorepo root-config mode.** Set `monorepoRootDir` (mutually exclusive with `packageRootDir`) in a single root ESLint or Oxlint config to cover the whole monorepo. See [Monorepos](./monorepos.html) for details.
- **`.jsonc` config files.** `import-integrity.config.json` and `import-integrity.config.jsonc` are both supported, including comments and trailing commas.
- **Next.js auto-detection.** When Next.js is detected, appropriate `externallyImportedFiles` patterns for app router, pages router, and mixed-router projects are pre-applied. User-supplied patterns override the defaults.
- **Entry point inference.** When `package.json` declares `main`/`exports` and `tsconfig.json` declares both `outDir` and `rootDir`, Import Integrity derives `entryPointFiles` automatically from the compiled exports.
- **New rules.** `no-empty-entry-points`, `no-unnamed-entry-point-exports`, and `no-unused-package-exports` (monorepo-only) are in the recommended configs.
- **Test-only export prefix.** Non-test files can export symbols prefixed with `_testOnly` to indicate they're only intended for test consumption. See [no-test-only-imports](../rules/no-test-only-imports/) for details.