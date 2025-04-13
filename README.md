# eslint-plugin-fast-import

[![npm version](https://badge.fury.io/js/eslint-plugin-fast-import.svg)](https://badge.fury.io/js/eslint-plugin-fast-import) ![ci workflow](https://github.com/nebrius/eslint-plugin-fast-import/actions/workflows/ci.yml/badge.svg) [![codecov](https://codecov.io/gh/nebrius/eslint-plugin-fast-import/graph/badge.svg?token=T6O54TXTKU)](https://codecov.io/gh/nebrius/eslint-plugin-fast-import)

- [Installation](#installation)
- [Rules](#rules)
- [Configuration](#configuration)
  - [Configuration options](#configuration-options)
    - [rootDir](#rootdir)
    - [alias](#alias)
    - [entryPoints](#entrypoints)
    - [ignorePatterns](#ignorepatterns)
    - [mode](#mode)
    - [editorUpdateRate](#editorupdaterate)
  - [debugLogging](#debuglogging)
- [Algorithm](#algorithm)
  - [Phase 1: AST analysis](#phase-1-ast-analysis)
  - [Phase 2: Module specifier resolution](#phase-2-module-specifier-resolution)
  - [Phase 3: Import graph analysis](#phase-3-import-graph-analysis)
- [Limitations](#limitations)
  - [All first party code must live inside `rootDir`](#all-first-party-code-must-live-inside-rootdir)
  - [Barrel exporting from third-party/built-in modules are ignored](#barrel-exporting-from-third-partybuilt-in-modules-are-ignored)
  - [Case insensitivity inconsistency in ESLint arguments](#case-insensitivity-inconsistency-in-eslint-arguments)
- [Comparison](#comparison)
- [Creating new rules](#creating-new-rules)
  - [getESMInfo(context)](#getesminfocontext)
  - [registerUpdateListener(listener)](#registerupdatelistenerlistener)
  - [isNonTestFile(filePath)](#isnontestfilefilepath)
- [Frequently Asked Questions](#frequently-asked-questions)
  - [Is this plugin a replacement for eslint-plugin-import/eslint-plugin-import-x?](#is-this-plugin-a-replacement-for-eslint-plugin-importeslint-plugin-import-x)
  - [Do you support user-supplied resolvers like eslint-plugin-import does?](#do-you-support-user-supplied-resolvers-like-eslint-plugin-import-does)
- [License](#license)


Fast Import implements a series of lint rules that validates imports and exports are used correctly. These rules specifically analyze who is importing what and looking for errors. Fast Import uses a novel algorithm that is significantly more performant than other import lint rules.

## Installation

```
npm install --save-dev eslint-plugin-fast-import
```

## Rules

💼 = Enabled in recommended config

| Name                                                                        | 💼   |
| --------------------------------------------------------------------------- | --- |
| [no-unused-exports](src/rules/unused/README.md)                             | 💼   |
| [no-cycle](src/rules/cycle/README.md)                                       | 💼   |
| [no-entry-point-imports](src/rules/entryPoint/README.md)                    | 💼   |
| [no-missing-imports](src/rules/missing/README.md)                           | 💼   |
| [no-external-barrel-reexports](src/rules/externalBarrelReexports/README.md) | 💼   |
| [no-test-imports-in-prod](src/rules/testInProd/README.md)                   | 💼   |

## Configuration

Fast Import only supports ESLint 9+ and flat configs. For most simple TypeScript applications, you can config Fast Import with:

```js
import { recommended } from 'eslint-plugin-fast-import';

export default [
  recommended()
];
```

This will apply the recommended rules along with the default configuration.

### Configuration options

Fast Import supports a number of configuration options. Fast Import attempts to auto-detect as many as possible, but you may need to tweak or suppliment these options.

#### rootDir

Type: `string`

Fast Import uses `rootDir` to scan for files. When Fast Import starts up for the first time, it creates a map of all files in a project. Fast Import finds all files inside of `rootDir`, filters out any ignored files (see [ignorePatterns](#ignorepatterns) for more info), and analyzes remaining files.

By default, Fast Import looks for a `tsconfig.json` file in the same directory as the ESLing configuration file, and uses the `rootDir` value from the TypeScript config file. If `tsconfig.json` does not exist or it does not set `rootDir`, then `rootDir` is set to the directory containing the ESLint configuration file.

Performance warning: if you set `rootDir` to a folder contianing `node_modules`, performance will suffer. Even when files inside of `node_modules` are ignored, it still takes some time to filter them out. This especially matters in `editor` mode, where we rescan the filesystem at regular intervals.

It is strongly recommended that you put your source code in a `./src` folder and set `rootDir` to `./src`.

Example:

```js
recommended({
  rootDir: './src'
})
```

Note: `rootDir` is relative to the directory containing your ESLint configuration file.

#### alias

Type: `Record<string, string>`

`alias` defines a set of module specifier aliases. For example, if you use Next.js with its default configuration, then an alias is automatically set so that `@/` points to `src/`, such that a file inside of `src` can import `src/components/foo/index.ts` with `@/components/foo`.

Fast Import defaults to the values inside of `tsconfig.json`, with a few limitations:
- Aliases that point to files outside of `rootDir`, or point to files inside of `node_modules`, are ignored
- Aliases with more than one file, e.g. `"@/": ["a.ts", "b.ts"]`, are ignored

Example:

```js
recommended({
  alias: {
    '@/*': 'src/*'
    'foo': 'src/foo.ts'
  }
})
```

Note: patterns with a single star after them will match any symbols/files that start with the symbol/filepath.

#### entryPoints

Type: `Array<{ file: string, symbols: string[]}>`

Entry points define exports that are not imported by code inside of the code base, but instead by code outside of the codebase.

For example, if you are building a Next.js application, then `default` export in files titled `page.tsx`, `layout.tsx`, etc. are imported by the Next.js runtime itself, and thus Fast Import never sees the import.

Entry points allows you to define these types of imports so they are not flagged as unused, and enable other useful checks

Example:

```js
recommended({
  entryPoints: [
    {
      file: './src/index.ts',
      symbols: ['default', 'anotherExport']
    }
  ]
})
```

#### ignorePatterns

Type : `string[]`

A list of ignore patterns, using the format used by `.gitignore` files. Files that match these patterns are excluded from analysis.

By default, Fast Import includes the contents of all `.gitignore` files that apply to each file, taking into account nesting, between the file in question and the closest parent folder that contains a `.git` folder. In other words, if you have a fully fleshed out `.gitignore` setup, you can likely ignore this setting.

Example:

```js
recommended({
  ignorePatterns: [
    'src/**/__test__/**/snapshot/**/*',
    '*.pid'
  ]
})
```
#### mode

Type: `'auto' | 'one-shot' | 'fix' | 'editor'`

When set to `auto`, Fast Import will do it's best to set this value for you by inspecting the environment.

`one-shot` mode assumes that each file will be linted exactly once. This mode optimizes for running ESLint from the command line without the `--fix` flag. In this mode, Fast Import first creates a map of all files, but does not enable any caching because it is assumed files will not be updated throughout the duration of the run.

`fix` builds on `one-shot` by introducing the caching layer. Each time a rule is called, Fast Import updates its cache if any imports/exports are modified in a file.

Finally, `editor` mode builds on `fix` mode by adding a file watcher to looks for changes at a regular interval defined by [`editorUpdateRate`](#editorupdaterate). When changes are detected, the file map is updated. This allows Fast Import to respond to changes outside of the editor, such as when running `git checkout`, `git stash`, etc.

Note: currently, VS Code is the only supported editor. If you would like support for another editor, open an issue and I'll work with you to get the information needed to support your editor. In the mean time, you can create a config that extends your standard config, set the mode to editor, and tell your editor to use this config file

Example:

```js
// eslint.editor.config.mjs
import standardConfig from './esling.config.mjs';

export default [
  ...standardConfig,
  recommended({
    mode: 'editor'
  })
]
```

#### editorUpdateRate

Type: `number`

Defines the rate in milliseconds at which Fast Import looks for file changes, and defaults to once every 5 seconds.

Example:

```js
recommended({
  editorUpdateRate: 2_000
})
```

### debugLogging

Type: boolean

When set to `true`, enables extra logging that lets you know performance numbers, when files are updated, and more.

Example:

```js
recommended({
  debugLogging: true
})
```

## Algorithm

Fast import works by using a pipelined algorithm that is very cache friendly. At its core, Fast Import works in three phases. Each phase is isolated from the other phases so that they can each implement a caching layer that is tuned for that specific phase.

### Phase 1: AST analysis

This phase reads in every non-ignored file from the filesystem with a known JavaScript extension: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx` and parses the file into an AST. The AST is then converted into an import/export specific form optimized for import/export analysis.

For example, the import statement `import { foo } from './bar'` gets boiled down to:

```js
{
  importAlias: 'foo',
  importName: 'foo'
  importType: 'single',
  isTypeImport: false,
  moduleSpecifier: './bar',
  statementNote: <AST Node of entire import statement>,
  reportNode: <AST Node of "foo">
}
```

This phase is by far the most performance intensive of the three phases, comprising over 95% of total execution time on a cold cache. At the same time, information computed for each file is completely independent of information in any other file. This fact is exploited at the caching layer, because changes to any one file do not result in cache invalidations of any other file.

For example, this phase takes 77ms on a cold cache running on this codebase, out of 78ms total. Subsequent file edits only take 1ms due to the high cacheability of this phase.

Details for the information computed in this stage can be viewed in the [types file for base information](./src/types/base.ts).

### Phase 2: Module specifier resolution

This phase goes through every import/reexport and resolves the module specifier. Fast Import uses its own high-performance resolver to improve lint speed. It achieves this performance by utilizing the file cache built up in the first phase. It then resolves module specifiers to one of three types in a very specific order:

1. A Node.js built-in module, as reported by `builtinModules()` in the `node:module` module
2. A file within `rootDir`, aka first party
3. A third party module

Module specifiers are resolved in this order because we already have a list of built-in modules and first party files _in memory_. By following this flow, we never have to touch the file system to do any resolving. This makes Fast Imports resolution algorithm considerably faster than other resolvers. In specific, by moving third party module resolution to the end, we can "default" to imports being third party imports and never have to look at `node_modules`.

In this phase, changes to one file may impact the information in another file. Nonetheless, determining which files is impacted is relatively straightforward. In addition, changes typically do not impact a large number of other file's caches. This means we can still use caching in this phase to measureably improve performance.

Details for the information computed in this stage can be viewed in the [types file for resolved information](./src/types/resolved.ts).

### Phase 3: Import graph analysis

This final stage traverses the import/export graph created in Phase 2 to determine the ultimate source of all imports/reexports. In addition, we store other useful pieces of information, such as collecting a list of everyone who imports a specific export, and linking each import statement to a specific export statement.

Linking imports to exports can be non-trivial, especially if there are a lot of reexports. For example:

```js
// a.ts
import b from './b'; // points to file d.ts!

// b.ts
export { default } from './c';

// c.ts
export { default } from './d';

// d.ts
export default 10; // Export for import in file a.ts!
```

Due to all the heavy lifting we've done in the first two phases, this phase is the least performance intensive of the three, comprising less than 1% of total execution time on a cold cache. It is also the most entangled and difficult to cache, as we saw in the example above. As a result, Fast Import does not do any caching during this phase, since it has little effect on overal performance anyways.

Details for the information computed in this stage can be viewed in the [types file for analyzed information](./src/types/analyzed.ts).

## Limitations

### All first party code must live inside `rootDir`

If files exist outside of `rootDir` and are imported by files inside of `rootDir`, then these imports will be marked as third party imports. However, since these files are not listed as a dependency in `package.json`, they will be flagged by the [no-missing-imports](src/rules/missing/README.md) rule.

### Barrel exporting from third-party/built-in modules are ignored

Fast Import disables all checks on barrel imports from third partybuiltin modules. For example, if you do this:

```js
// a.ts
export * from 'node:path';

// b.ts
import { fake } from './a';
```

Fast Import will not flag this as an error. This level of indirection is discouraged anyways, and is why Fast Import ships with the [no-external-barrel-reexports](src/rules/externalBarrelReexports/README.md) rule.

### Case insensitivity inconsistency in ESLint arguments

If you pass a file pattern or path to ESLint, ESLint incosistenly applies case insensitivity. For example, let's say you have a file at `src/someFile.ts`, and you run ESLint with `eslint src/somefile.ts`. ESLint will parse the file, but it reports the filename internally as `src/somefile.ts`, not `src/someFile.ts`. However, Fast Import will only be aware of the file at `src/someFile.ts`, and will crash.

## Comparison

TODO

## Creating new rules

Fast import is designed to be extended. For a complete example, check out the source code for the [no-unused-exports](src/rules/unused/unused.ts) lint rule for a relatively simple example, or the source code for the [no-cycle](src/rules/cycle/cycle.ts) rule for a more complex example. Fast Import exports three helper functions used to write rules.

### getESMInfo(context)

This is the most important of the three functions. If the file represented by the ESLint context has been analyzed by Fast Import, an objet with three properties are returned, otherwise `undefined` is returned:

- `fileInfo`: the imports, reexports, and exports of the current file
- `projectInfo`: the imports, reexports, and exports of the entire project
- `settings`: the computed settings, with all defaults applied, used by Fast Import

See the TypeScript types for full details, which are reasonably well commented.

Each import, export, and reexport entry includes two AST nodes: the node for the entire statement, and a "report" node that is almost always what you want to pass to `context.reportError`. The report node is scoped to the most useful AST node representing the import, export, or reexprt. For example, in `import { foo } from './bar'`, the statement node represents all of the code, and `reportNode` is scoped to just `foo`.

When creating a rule, you shouldn't traverse the AST yourself, since the AST has been traversed. Each `context` callback should look something like this:

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

  return {};
}
```

Note that an empty object is returned, indicating we don't want to traverse the AST.

### registerUpdateListener(listener)

Some rules may compute their own derived information that is also performance sensitive, such as the `no-cycle` rule. In these cases, you can rely on the `registerUpdateListener` callback to be notified any time the cahce is updated.

### isNonTestFile(filePath)

A helper function to determine, using Fast Imports algorithm, whether or not a given file path represents a test file. Currently, a file is considered a test file if either of the following are true:

- The file is directly or indirectly inside a folder called `__test__`
- The file includes `.test.` in it's name.

## Frequently Asked Questions

### Is this plugin a replacement for [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import)/[eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x)?

No, for the most part. Fast Import replaces a few select rules from import and import x that are known to be slow, such as `no-cycle`, but otherwise strives to coexist with these packages. It is recommended that you continue to use these other rules for more comprehensive import analysis.

### Do you support user-supplied resolvers like eslint-plugin-import does?

No, Fast Import cannot use off the shelf resolvers, by design. Off the shelf resolvers work by reading the filesystem to see what files are available, which is inhernetly slow. By contrast, Fast Import uses its own resolution algorithm that reuses information that already exists in memory so that it never has to touch the filesystem. This resolution algorithm is one of the key reasons Fast Import is able to achieve the performance it does.

If Fast Import's resolution algorithm does not support your use case, please file an issue and I'll try to add support for it.

For more information, see the algorithm section [Phase 2: Module specifier resolution](#phase-2-module-specifier-resolution).

## License

Copyright (c) 2025 Bryan Hughes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
