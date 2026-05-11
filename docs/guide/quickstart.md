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

For typical setups where one lint config covers one package, you can enable Import Integrity in your ESLint configuration file with:

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

For a full working example, see this repo's own [eslint.config.mjs](https://github.com/nebrius/import-integrity-lint/blob/main/eslint.config.mjs).

## Oxlint

You can enable Import Integrity in your Oxlint configuration file with:

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

- Review the [Configuration](../configuration/) section for available settings.
- Review the [Rules](../rules/) reference to see what the recommended config enables.
