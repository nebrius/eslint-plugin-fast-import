---
title: Oxlint
description: Configure Import Integrity with Oxlint.
outline: deep
---

# Oxlint

Import Integrity works with [Oxlint](https://oxc.rs/docs/guide/usage/linter) via its [JS plugin interface](https://oxc.rs/docs/guide/usage/linter/js-plugins).

Configuration is similar to ESLint, except that you spread `importIntegrityPlugin.configs.recommended.rules` and/or `importIntegrityPlugin.configs.monorepoRecommended.rules` into Oxlint's `rules` object at the top level and add it to the `jsPlugins` array:

```ts
import importIntegrityPlugin from 'import-integrity-lint';

export default {
  jsPlugins: [
    {
      name: 'import-integrity',
      specifier: 'import-integrity-lint',
    },
  ],
  rules: {
    ...importIntegrityPlugin.configs.recommended.rules,
  },
  settings: {
    'import-integrity': {
      monorepoRootDir: import.meta.dirname,
    },
  },
};
```

For a full working example, see this repo's own [oxlint.config.ts](https://github.com/nebrius/import-integrity-lint/blob/main/oxlint.config.ts).
