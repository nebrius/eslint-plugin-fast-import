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

The following sections build up from a minimal config to a typical real-world config. Stop at the level that matches your project.

### Minimal config

The simplest working config for a single-package JavaScript codebase:

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

This enables the recommended ruleset and points Import Integrity at the current directory as the package root.

### Adding TypeScript support

To lint TypeScript files, ESLint needs the TypeScript parser registered. Install the parser:

```bash
npm install --save-dev typescript-eslint
```

And update your config:

```js
import { defineConfig } from 'eslint/config';
import importIntegrityPlugin from 'import-integrity-lint';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    settings: {
      'import-integrity': {
        packageRootDir: import.meta.dirname,
      },
    },
  },
  importIntegrityPlugin.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
  },
]);
```

The `@typescript-eslint` plugin is registered (not configured with rules) so that `// eslint-disable` pragmas pointing to `@typescript-eslint/*` rules don't error out as unknown rules.

### Monorepo setup

For monorepos, switch to `monorepoRecommended` and use `monorepoRootDir` instead of `packageRootDir`:

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

A few changes worth noting:

- `monorepoRecommended` includes the cross-package rules like `no-unused-package-exports`
- `monorepoRootDir` points at the monorepo root; individual package roots are auto-discovered
- `reportUnusedDisableDirectives: 'off'` is included because a minimal config like this one doesn't enable enough rules to validate every disable directive, leading to false positives

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