---
title: Quickstart
description: Install Import Integrity and enable the recommended config.
outline: deep
---

# Quickstart

## Installation

Install the plugin from npm:

```bash
npm install --save-dev import-integrity-lint
```

## ESLint

### Single package

For a single-package codebase, the configuration is minimal:

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

This enables the recommended ruleset and points Import Integrity at the current directory as the package root. Combine with your usual TypeScript parser setup if you have one.

### Monorepo

For monorepos with a single root config, switch to `monorepoRecommended` and use `monorepoRootDir` instead of `packageRootDir`. A root config typically also needs a couple of additional pieces because it sits above package-specific configs:

```js
import { defineConfig } from 'eslint/config';
import importIntegrityPlugin from 'import-integrity-lint';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    settings: {
      'import-integrity': {
        monorepoRootDir: import.meta.dirname,
      },
    },
  },
  importIntegrityPlugin.configs.monorepoRecommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    linterOptions: {
      // This minimal config produces many false positives for unused
      // disable directives, since they likely are used in package-specific
      // configs. We disable the check to avoid noise.
      reportUnusedDisableDirectives: 'off',
    },
    plugins: {
      // We have to enable the typescript-eslint plugin so eslint-disable
      // pragmas point to valid rules, even if they aren't enabled
      '@typescript-eslint': tseslint.plugin,
      // Enable any other plugins used in package-specific configs here
    },
  },
]);
```

A few notes:

- `monorepoRecommended` includes the cross-package rules like `no-unused-package-exports`
- `monorepoRootDir` points at the monorepo root; individual package roots are auto-discovered

For more on monorepo setup, including the alternative one-config-per-package pattern, see [Monorepos](./monorepos).

For a full working example, see this repo's own [eslint.config.mjs](https://github.com/nebrius/import-integrity-lint/blob/main/eslint.config.mjs).

## Oxlint

Oxlint's plugin integration is simpler than ESLint's. The full working config:

```js
import importIntegrityPlugin from 'import-integrity-lint';

export default {
  settings: {
    'import-integrity': {
      packageRootDir: import.meta.dirname,
    },
  },
  jsPlugins: [
    {
      name: 'import-integrity',
      specifier: 'import-integrity-lint',
    },
  ],
  rules: {
    ...importIntegrityPlugin.configs.recommended.rules,
  },
};
```

For a full working example, see this repo's own [oxlint.config.ts](https://github.com/nebrius/import-integrity-lint/blob/main/oxlint.config.ts).

## Next steps

- Read [Configuration](../configuration/) to see the available settings.
- Read [Rules](../rules/) to see what the recommended config enables.
- If you're in a monorepo, read [Monorepos](./monorepos) for the bigger picture on monorepo setup.