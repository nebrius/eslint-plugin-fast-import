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
- `importIntegrityPlugin.configs.recommended` is included statically like other ESLint plugins, not called as a function
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

The shape of this option changed, and the new version often doesn't need to be set at all.

**Old:**

```js
entryPoints: {
  './src/app/**/page.tsx': ['default', 'metadata'],
  './src/index.ts': ['default'],
}
```

**Migration logic, in priority order:**

1. **Check whether the inference covers it.** Import Integrity now infers entry points automatically in some cases. The inference applies if your package.json declares exports or main and one of the following is true: your tsconfig.json declares both outDir and rootDir, or the file package.json points to has a .ts extension. If either case applies, remove the entry from the new config.

2. **Remove config-file entries.** Files matching `*.config.*` (e.g. `eslint.config.mjs`, `vite.config.ts`, `tailwind.config.js`) are now automatically treated as externally imported. If your old `entryPoints` listed any config files explicitly, remove them.

3. **Move Next.js routing patterns to `externallyImportedFiles`.** The old `./src/app/**/page.tsx` pattern moves to `externallyImportedFiles` (see Step 7), not `entryPointFiles`. Next.js routing exports are externally imported by the framework, not entry points of a public API. If you have Next.js patterns, they likely don't need to be listed explicitly anyway — Next.js auto-detection pre-applies them.

4. **For anything that remains, write it as a subpath map.** The new shape uses a `package.json` `exports`-style subpath map. The subpath (typically `'.'`) is the key and the file path is the value:

```js
entryPointFiles: {
  '.': './src/index.ts',
}
```

The old per-symbol filtering (the `['default', 'metadata']` array) is gone. All exports from the listed file are now treated as entry points.

In most cases, by the time you've worked through steps 1 and 2 above, `entryPointFiles` is empty or unnecessary and you can omit it entirely.

## Step 7: Convert `externallyImported` to `externallyImportedFiles`

The shape of this option changed, and many entries can likely be removed entirely.

**Old:**

```js
externallyImported: {
  'index.ts': /.*/,
  'src/app/**/page.tsx': /.*/,
}
```

**Migration logic, in priority order:**

1. **Remove config-file entries.** Files matching `/*.config.*` (e.g. `eslint.config.mjs`, `vite.config.ts`, `tailwind.config.js`) are now automatically treated as externally imported. If your old `externallyImported` listed any config files explicitly, remove them.

2. **Check whether Next.js auto-detection covers it.** Import Integrity now auto-detects Next.js projects and pre-applies appropriate `externallyImportedFiles` patterns for app router or pages router projects (with or without a `src/` directory). If your old entries were Next.js app router or pages router patterns (`page.tsx`, `layout.tsx`, etc.), they can be removed entirely. If your project uses both routers, only the app router defaults are auto-applied; you'll still need to list pages router patterns explicitly in bullet 2 below.

3. **For anything that remains, write it as a gitignore-style pattern array.** The new shape is a flat array of gitignore-style patterns. Leading `/` anchors to the package root:

```js
externallyImportedFiles: [
  '/index.ts',
]
```

The old per-symbol filtering (the regex values like `/.*/`) is gone. All exports from listed files are now treated as externally imported.

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

## Step 10: (Optional) Refactor test-only export workarounds

This step is optional and improves code quality but is not required for the upgrade to work.

If your codebase has exports that were previously suppressed with disable pragmas because they're only consumed by tests, you can now mark them explicitly with the `_testOnly` prefix. This is cleaner than disable pragmas and is the supported pattern in Import Integrity.

**Find:**

```js
// eslint-disable-next-line fast-import/no-unused-exports
export function helperUsedOnlyByTests() { /* ... */ }
```

**Replace with:**

```js
export function _testOnlyHelperUsedOnlyByTests() { /* ... */ }
```

Then update the import sites in test files to use the new name:

**Find:**

```js
import { helperUsedOnlyByTests } from './module';
```

**Replace with:**

```js
import { _testOnlyHelperUsedOnlyByTests } from './module';
```

The `_testOnly` prefix tells Import Integrity that this export is intended to be imported only by test files. The `no-test-only-imports` rule (enabled in `recommended`) will flag any non-test file that tries to import a `_testOnly`-prefixed symbol.

**Note for AI agents:** This refactor requires renaming exports and updating import sites across the codebase. The find/replace pattern above is mechanical but the cascade of rename impacts is wide. After completing the renames, run your test suite to verify nothing is broken before proceeding.

## Step 11: Decide on `require-node-prefix`

The `require-node-prefix` rule was previously only enabled in the `all` config. In Import Integrity, it is enabled in `recommended` and may flag new errors in code that imports Node built-ins without the `node:` prefix (e.g. `import 'path'` instead of `import 'node:path'`).

If you want to keep this rule active, no action is needed — it's fixable with `--fix`.

If you want to preserve the previous default-off behavior:

```js
rules: {
  'import-integrity/require-node-prefix': 'off',
}
```

## Step 12: Custom rule helpers (only if you wrote custom rules)

If you wrote custom lint rules using Import Integrity's helper API, the helper function call shapes changed.

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

The callback now receives a per-package `packageRootDir` argument. In monorepos, the listener may be invoked once per package.

```js
// Old
registerUpdateListener(() => { /* ... */ });

// New
registerUpdateListener((packageRootDir) => { /* ... */ });
```

**Downstream type changes need human review.**

The data structures returned by these helpers have many additional changes beyond the surface-level renames above (fields renamed, restructured, added, or removed). These changes are too numerous to enumerate here and depend on what your custom rule actually does with the returned data.

If you are an AI agent following this guide, do not attempt to mechanically update custom rule code beyond the surface-level changes shown above. Stop and surface this step to the human user. The TypeScript types are well-documented with JSDoc comments in `src/types/base.ts`, `src/types/resolved.ts`, and `src/types/analyzed.ts` of the [import-integrity-lint repository](https://github.com/nebrius/import-integrity-lint), and should be reviewed together with the custom rule code to update everything correctly.

## Behavior changes to expect after upgrading

After completing the migration, lint output may differ from the old version in a few ways. These are intentional changes, not bugs.

**Cycle detection algorithm changed.** The `no-cycle` rule now uses Tarjan's strongly-connected-components algorithm. Cycle counts may differ from fast-import 2.x. Counts are now deterministic across runs (the old implementation was order-dependent and could drop cycles depending on file traversal order).

**Side-effect imports are now tracked.** Imports like `import 'foo'` (no bindings) are now considered when detecting cycles. This may surface cycles that were previously missed.

**Default ignored folders expanded.** Any folder starting with `.` is now ignored (which subsumes the previous explicit `.git` entry). The folder `out` is now also ignored by default. If you previously relied on linting code in such folders, you'll need to file an issue.

## Optional: features available after upgrading

These are new features in Import Integrity that you can adopt at your discretion. None are required for the migration itself.

- **Monorepo root-config mode.** Set `monorepoRootDir` (mutually exclusive with `packageRootDir`) in a single root ESLint or Oxlint config to cover the whole monorepo. See [Monorepos](./monorepos.html) for details.
- **`.jsonc` config files.** `import-integrity.config.json` and `import-integrity.config.jsonc` are both supported, including comments and trailing commas.
- **New rules.** `no-empty-entry-points`, `no-unnamed-entry-point-exports`, and `no-unused-package-exports` (monorepo-only) are in the recommended configs.
- **Test-only export prefix.** Non-test files can export symbols prefixed with `_testOnly` to indicate they're only intended for test consumption. See [no-test-only-imports](../rules/no-test-only-imports/) for details.