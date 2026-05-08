---
title: Guide
description: Start here to learn how to use Import Integrity.
outline: deep
---

# Guide

Import Integrity implements a series of lint rules that validates imports and exports are used correctly. These rules specifically analyze who is importing what and looking for errors.

Import Integrity uses a novel algorithm combined with the [Oxc Rust based parser](https://www.npmjs.com/package/oxc-parser) that is significantly more performant than other third-party ESLint import plugins. Import Integrity also includes an editor mode that keeps its internal datastructures up to date with file system changes. This way you don't get stale errors in your editor when you change branches, unlike other plugins.

## Pages

- [Getting started](./getting-started) shows the minimal ESLint and Oxlint setup.
- [Comparisons](./comparisons) explains the performance and accuracy comparison with `eslint-plugin-import` and `eslint-plugin-import-x`.
- [Algorithm](./algorithm) explains the four-phase analysis pipeline.
- [Limitations](./limitations) documents important unsupported or intentionally limited patterns.
- [Creating rules](./creating-rules) explains extension helpers for custom Import Integrity-powered rules.
- [FAQ](./faq) answers common questions.

## Reference

- [Configuration](../configuration/) documents all repo-level and package-level settings.
- [Rules](../rules/) lists the built-in lint rules.
