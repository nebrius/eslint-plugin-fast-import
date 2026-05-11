---
title: Welcome
description: Start here to learn how to use Import Integrity.
outline: deep
---

# Welcome to the Import Integrity docs

Import Integrity is a linter for ESLint and Oxlint that analyzes the imports, exports, and module relationships across your codebase. It catches dead exports, broken boundaries, common footguns, and other issues that accumulate as a codebase grows.

## Sections

These docs are split into the following sections:

- [Guide](./) — walkthroughs and explanations. Start here if you're setting up Import Integrity, evaluating it, or trying to understand how it works.
- [Configuration](../configuration/index.md) — the full reference for repo-level and package-level settings.
- [Rules](../rules/index.md) — the full reference for the built-in lint rules.

## Where to start

- If you've never used Import Integrity before, head to [Quickstart](./quickstart.md). It covers a minimal setup for both ESLint and Oxlint.
- If you're using Import Integrity in a workspace repo, [Monorepos](./monorepos.md) covers the recommended setup patterns.
- If you're evaluating Import Integrity against other plugins, [Comparisons](./comparisons.md) covers how it differs from eslint-plugin-import and eslint-plugin-import-x.
- If you want to understand the internals, [How it works](./how-it-works.md) walks through the four-phase analysis pipeline that makes whole-codebase analysis tractable.
- If you're hitting an edge case, the [FAQ](./faq.md) covers common questions and documents limitations of Import Integrity.
- If you want to build your own rules on top of Import Integrity, [Creating rules](./creating-rules.md) explains the extension API.
