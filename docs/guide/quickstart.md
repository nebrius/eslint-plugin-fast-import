---
title: Quickstart
description: Install Import Integrity and enable the recommended config.
outline: deep
---

# Quickstart

Install the plugin from npm:

```bash
npm install --save-dev import-integrity-lint
```

For typical setups where the lint config is configured to lint a single package, you can enable Import Integrity in ESLint with:

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

And if you're using Oxlint, you can enable Import Integrity with:

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

## Next steps

- Review the [Configuration](../configuration/) section for available settings.
- Review the [Rules](../rules/) reference to see what the recommended config enables.
- If you use a workspace repository, see [Monorepos](../configuration/monorepos).
- If you use Oxlint, see the [Oxlint configuration guide](../configuration/oxlint).
