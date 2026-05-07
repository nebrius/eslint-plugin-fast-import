---
title: Package-level options
description: Package-level Import Integrity configuration options.
outline: deep
---

# Package-level options

The remaining options are package-scoped. In single-repo mode, place them in `settings['import-integrity']` or in a `import-integrity.config.json`/`import-integrity.config.jsonc` file in `packageRootDir` (but not both). In monorepo mode, place them in a package's Import Integrity config if that package needs non-default values. The examples below use the single-repo form.

## `alias`

Type: `Record<string, string>`

Default: aliases in `tsconfig.json`

`alias` defines a set of module specifier aliases. For example, if you use Next.js with its default configuration, you're probably familiar with the alias it creates: `@/` points to `src/`, such that a file inside of `src` can import `src/components/foo/index.ts` with `@/components/foo`.

Import Integrity defaults to the values inside of `tsconfig.json`, if present, with a few limitations:

- Aliases that point to files outside of `packageRootDir`, or point to files inside of `node_modules`, `build`, `out`, `dist`, or any folder or file that starts with a `.`, are ignored
- Aliases with more than one file, e.g. `"@/": ["a.ts", "b.ts"]`, are ignored

Example:

```js
{
  settings: {
    'import-integrity': {
      packageRootDir: import.meta.dirname,
      alias: {
        '@/*': 'src/*',
        'foo': 'src/foo.ts',
      },
    },
  },
}
```

Note: patterns with a single star after them will match any symbols/files that start with the symbol/filepath.

## `externallyImportedFiles` / `entryPointFiles`

Type: `string[]` / `Record<string, string>`

Default (`entryPointFiles`): package.json entry points under certan conditions, else `{}`

Default (`externallyImportedFiles`): Next.js values if Next.js is detected, else `[]`

Files specified with `externallyImportedFiles` or `entryPointFiles` define files whose exports are not imported by code inside of the codebase, but instead by code outside of the codebase. All exports from any matching file are treated as entry points or externally imported. The difference between the two is:

- `entryPointFiles` are intended to represent entry points in a library intended for use by others, aka a "public API."
- `externallyImportedFiles` are intended to represent exports intended for use by a specific framework, e.g. the default export in a `page.tsx` file in a Next.js application.

In practice, this distinction only matters in monorepos. In the monorepo case, this categorization is necessary to determine if a package's entry points are intended to be used by other packages in the monorepo to, and thus should be analyzed for usage for the [no-unused-package-exports](../rules/no-unused-package-exports/) rule. See [Monorepos](./monorepos) for more info.

Entry points/externally imported files enable other useful checks such as the [no-entry-point-imports](../rules/no-entry-point-imports/) rule.

`externallyImportedFiles` are specified as an array of strings using the same ignore syntax you find in `.gitignore`, including the use of `/` to anchor an entry to the root of the package, and the use of `*` and `**` as wildcards.

`entryPointFiles` are specified as an object of subpaths to files, like you use in the `exports` field in package.json without conditions, including the use of `*` as a wildcard. See the [Node.js package entry points](https://nodejs.org/api/packages.html#package-entry-points) documentation for more info, and note the limitation on [entry point file patterns with more than one wildcard](https://github.com/nebrius/import-integrity-lint/blob/main/README.md#entrypoint-file-patterns-with-more-than-one-wildcard-are-not-supported).

Example:

```js
{
  settings: {
    'import-integrity': {
      packageRootDir: import.meta.dirname,
      externallyImportedFiles: [
        '/src/app/**/page.tsx',
        '/src/app/**/layout.tsx',
      ],
      entryPointFiles: {
        '.': './src/index.ts',
      },
    },
  },
}
```

Import Integrity inspects your app and applies a few common defaults for `externallyImportedFiles` and `entryPointFiles`.

Entry points will be autopopulated for you if you populate the `exports`/`main` field in `package.json` _and_ you define `outDir` and `rootDir` in your `tsconfig.json`. Import Integrity requires both in order to be confident that we can and should map from the compiled output (what `package.json` points to) back to the source code (what Import Integrity needs).

Config files matching `/*.config.*` are always included in `externallyImportedFiles` and cannot be overridden.

Next.js is autodetected by Import Integrity, and the appropriate externally imported patterns are pre-applied. Import Integrity takes into account whether you are using a `src` directory or not, and whether app router patterns should be applied. When app router patterns are applied, pages router patterns are included too because Next.js allows both routers to coexist. If you supply your own patterns, they will override these defaults.

## `ignorePatterns`

Type : `string[]`

Default; `[]`

A list of ignore patterns, using the format used by `.gitignore` files. Files that match these patterns are excluded from analysis.

By default, Import Integrity includes the contents of all `.gitignore` files that apply to each file, taking into account nesting, between the file in question and the closest parent folder that contains a `.git` folder. In other words, if you have a fully fleshed out `.gitignore` setup, you can ignore this setting.

Example:

```js
{
  settings: {
    'import-integrity': {
      packageRootDir: import.meta.dirname,
      ignorePatterns: [
        'src/**/__test__/**/snapshot/**/*',
        '*.pid',
      ],
    },
  },
}
```

## `ignoreOverridePatterns`

Type : `string[]`

Default; `[]`

A list of "inverse" ignore patterns that negate other ignore patterns, using the format used by `.gitignore` files. This pattern is useful if your `.gitignore` file includes generated code that is needed for proper import/export analysis.

Example:

```js
{
  settings: {
    'import-integrity': {
      packageRootDir: import.meta.dirname,
      ignoreOverridePatterns: [
        'src/generated/**/*.ts',
      ],
    },
  },
}
```

## `testFilePatterns`

type: `string[]`

Default: `[ '.test.', '.spec', '__test__', '__tests__', '__fixture__' ]`

Several rules take into account whether or not a given file is a "test" file or a "production" file. This option allows you to define extra patterns in addition to the default three to indicate other test files. Note that globs are not currently supported.

Example:

```js
{
  settings: {
    'import-integrity': {
      packageRootDir: import.meta.dirname,
      testFilePatterns: ['__custom_test__'],
    },
  },
}
```
