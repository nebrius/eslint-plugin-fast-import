---
title: FAQ
description: Frequently asked questions about Import Integrity.
outline: deep
---

# Frequently Asked Questions

## Is this plugin a replacement for eslint-plugin-import/eslint-plugin-import-x?

No, not for the most part. Import Integrity replaces a few select rules from import and import x that are known to be slow, such as `no-cycle`, but otherwise strives to coexist with these packages. It is recommended that you continue to use rules these packages provide that Import Integrity does not.

## Do you support user-supplied resolvers like eslint-plugin-import does?

No, Import Integrity cannot use off the shelf resolvers, by design. Off the shelf resolvers work by reading the filesystem to see what files are available, which is inherently slow. By contrast, Import Integrity uses its own resolution algorithm that reuses information that already exists in memory so that it never has to touch the filesystem. This resolution algorithm is one of the key reasons Import Integrity is able to achieve the performance it does.

If Import Integrity's resolution algorithm does not support your use case, please file an issue and I'll try to add support for it.

For more information, see [Phase 2: Module specifier resolution](./algorithm#phase-2-module-specifier-resolution).
