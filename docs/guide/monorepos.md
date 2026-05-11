---
title: Monorepos
description: Configure Import Integrity in monorepos.
outline: deep
---

# Monorepos

Import Integrity is designed to work well in monorepos. The caching mechanism described in [How it works](./how-it-works) is monorepo aware, allowing Import Integrity to manage multiple caches for different packages in the monorepo simultaneously.

Monorepos can be configured in a few ways, as described below.

## Option 1: one root config with `monorepoRootDir`

Use this when you want one top-level ESLint or Oxlint config to cover the whole monorepo.

Warning: using a single root config exclusively can cause performance issues. See Option 3 for a more performant approach and explanation of performance issues with single root configs.

1. Set `settings['import-integrity'].monorepoRootDir` in your root ESLint or Oxlint config.
2. Optionally add a `import-integrity.config.json`/`import-integrity.config.jsonc` config file to any workspace package that needs non-default package-scoped options.
3. Put package-scoped options such as `alias`, `entryPointFiles`, `externallyImportedFiles`, `ignorePatterns`, `ignoreOverridePatterns`, and `testFilePatterns` in those package config files.

Example structure:

```text
repo
├── eslint.config.mjs
└── packages
    ├── web
    │   └── src
    └── shared
        ├── import-integrity.config.jsonc
        └── src
```

Root config:

```js
{
  settings: {
    'import-integrity': {
      monorepoRootDir: import.meta.dirname,
    },
  },

  ...importIntegrityPlugin.configs.monorepoRecommended,
}
```

Shared package config:

```js
{
  testFilePatterns: ['__custom_test__'],
}
```

Import Integrity discovers workspace packages from your monorepo configuration under `monorepoRootDir`. Each discovered workspace package becomes a package root. If a workspace package has a Import Integrity config file at its root, that file is loaded, otherwise default package-level settings are used.

Note: config files outside the declared workspace globs are ignored.

## Option 2: separate configs per package

You can also keep monorepo packages on separate ESLint configs using the same single package mode setup shown earlier, with each package setting its own `packageRootDir`.

Warning: the `monorepoRecommended` configuration does not work with this option because it won't see any other packages.

Example package-local config:

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

## Option 3: root + separate configs (recommended)

In a monorepo, I recommend that you use nested ESLint/Oxlint config files, with a minimal configuration at the repo root and putting everything else in per-package configs. Then you configure separate ESLint instances to run on every file, including the root config. This allows you to enable repo-wide rules that must be declared at the root, such as [no-unused-package-exports](../rules/no-unused-package-exports/), without paying the performance cost of having _all_ lint rules at the root.

ESLint is single-threaded by default, and using `--concurrency` requires typescript-eslint, Import Integrity, and others to duplicate the expensive cross-file computations, thus erasing multithreaded gains. This means that a root-level config will lint your entire codebase serially or take a performance hit so great it might as well be linted serially.

If you have package-level configs however and are using a multithreaded/multiprocess repo manager like Nx or Turborepo, linting gets parallelized. In addition, these repo managers cache per-package results and doesn't rerun them if files/dependencies have not changed. Using a root-level config means we cant take advantage of this parallelization or caching.

This performance difference can be especially important when running ESLint in an editor or when using an LSP-aware AI agent such as [Claude Code](https://github.com/boostvolt/claude-code-lsps/blob/main/README.md), where response time is important. Oxlint is multithreaded and so is less sensitive to this issue, but Oxlint JS Plugins (including Import Integrity) are not multithreaded and thus still susceptible to this issue.

To combine these two options, you use per-package Import Integrity configuration files where needed. The root config uses `monorepoRootDir` and discovers workspace packages from your monorepo configuration. The per-package config sets `packageRootDir`, and if a `import-integrity.config.json`/`import-integrity.config.jsonc` file exists at that package root Import Integrity will pick it up automatically. Do _not_ put any package-level settings in package-local ESLint/Oxlint config file's `settings['import-integrity]` section.

For a complete working example of this approach, see my [Aquarium Control project](https://github.com/nebrius/aquarium-control).

Warning: as of this writing, Oxlint struggles with nested configs when combined with an LSP (editor or AI agent) and may throw an error. See https://github.com/oxc-project/oxc/issues/19937 for more details. Hopefully this will be resolved soon, but if you need to run in an LSP-based environment, you may need to use the first option. ESLint handles nested configs without any issues.
