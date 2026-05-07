---
title: Configuration
description: Overview of Import Integrity configuration modes and file locations.
outline: deep
---

# Configuration

Configuration options are split into two groups: repo-level configuration options and package-level configuration options. In the single package case, which we call "single package mode", there isn't a distinction between the two groups. When [using a lint config at the repo root](./monorepos#option-1-one-root-config-with-monoreporootdir) to apply to more than one package, which we call "monorepo mode," repo-level options apply to all packages in the monorepo, while package-level options are specified per-package.

To support this "split-level" configuration, Import Integrity uses separate configuration files for package-level options that are independent of the ESLint/Oxlint configuration, while repo-level options go in `settings['import-integrity']` in the ESLint/Oxlint configuration file.

In single package mode, package-level options can also go in `settings['import-integrity']` if you prefer to not create a separate configuration file.

In monorepo mode, custom package-level options are required to be in a configuration file, not `settings['import-integrity']`. Import Integrity uses your monorepo's workspace configuration to determine which packages to analyze (supports Yarn, npm, Lerna, pnpm, Bun, and Rush). If a workspace package has a configuration file, Import Integrity loads its package-level options from that file. Workspace packages without a configuration file fall back to default values for all package-level options.

Configuration files are written using JSON-C (JSON with comments) and are named `import-integrity.config.json` or `import-integrity.config.jsonc`. These files must live in the package root dir as a sibling to `package.json` and `tsconfig.json`. In monorepo mode, you must set `name` in `package.json`, because this is used by Import Integrity for cross-package import analysis.

## Next steps

- [Repo-level options](./repo-level-options) cover settings that apply to a whole package or monorepo.
- [Package-level options](./package-level-options) cover settings scoped to one package.
- [Monorepos](./monorepos) covers the recommended setup patterns for workspace repositories.
- [Oxlint](./oxlint) covers Import Integrity's Oxlint JS plugin setup.
