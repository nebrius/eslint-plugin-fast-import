---
title: Creating rules
description: Extend Import Integrity with custom rules.
outline: deep
---

# Creating new rules

Import Integrity is designed to be extended. For a complete example, check out the source code for the [no-unused-exports](https://github.com/nebrius/import-integrity-lint/blob/main/src/rules/no-unused-exports/rule.ts) lint rule for a relatively simple example, or the source code for the [no-cycle](https://github.com/nebrius/import-integrity-lint/blob/main/src/rules/no-cycle/rule.ts) rule for a more complex example. Import Integrity exports a few helper functions used to write rules.

## `getESMInfo(context)`

This is the most important of the four functions. If the file represented by the ESLint context has been analyzed by Import Integrity, an object with the following properties is returned, otherwise `undefined` is returned:

- `fileInfo`: analyzed ESM info for the current file
- `packageInfo`: analyzed ESM info for the current package
- `packageSettings`: the computed package settings, with defaults applied, used by Import Integrity for the current file

In monorepos, `packageSettings` may come from a package-local Import Integrity config file while repo-level settings such as `mode` still come from the root ESLint or Oxlint config.

See the TypeScript types for full details, which are reasonably well commented.

Each ESM entry includes two AST node ranges: `statementNodeRange` and `reportNodeRange`. A range is the start and end string indices of the node in the original source code. The first range is the range for the entire statement, and the second is a "report" range that is almost always what you want to pass to `context.report`. The report range is scoped to the most useful AST node representing the import, export, or reexport. For example, in `import { foo } from './bar'`, the statement range represents all of the code, and the report range is scoped to just `foo`.

See [`getLocFromRange`](#getlocfromrangecontext-range) for more information on using ranges to report errors.

When creating a rule, you shouldn't traverse the AST yourself, since the AST has already been traversed for you. Each `context` callback should look something like this:

```js
create(context) {
  const esmInfo = getESMInfo(context);
  if (!esmInfo) {
    return {};
  }

  const { fileInfo } = esmInfo;
  // fileType indicates if this is a JS parseable file, or something else such as a JSON, PNG, etc
  if (fileInfo.fileType !== 'code') {
    return {};
  }

  // Do checks here

  // Always return an empty object
  return {};
}
```

Note that an empty object is returned, indicating we don't want to traverse the AST.

## `getLocFromRange(context, range)`

As we read in the previous section, Import Integrity provides AST ranges for reporting errors. `context.report` however doesn't accept ranges directly, so we need to convert it first. `getLocFromRange` is a small wrapper around ESLint's built-in utilities for converting ranges to locations, which `context.report` _can_ accept. Reporting an error using this function looks like this:

```js
context.report({
  messageId: 'someMessageId',
  loc: getLocFromRange(context, someImportEntry.reportNodeRange),
});
```

## `registerUpdateListener(listener)`

Some rules may compute their own derived information that is also performance sensitive, such as the `no-cycle` rule. In these cases, you can rely on `registerUpdateListener` to be notified any time Import Integrity refreshes the cache for a package. The callback receives the affected `packageRootDir`.

## `isNonTestFile(filePath)`

A helper function to determine whether or not a given file path should be treated as a non-test file. It uses the default test-file patterns (`.test.`, `__test__`, and `__tests__`) plus any additional entries from `packageSettings.testFilePatterns`.

Example:

```js
if (isNonTestFile(context.filename)) {
  // production-only logic
}
```
