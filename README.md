# eslint-plugin-fast-import

[![npm version](https://badge.fury.io/js/eslint-plugin-fast-import.svg)](https://badge.fury.io/js/eslint-plugin-fast-import) ![ci workflow](https://github.com/nebrius/eslint-plugin-fast-import/actions/workflows/ci.yml/badge.svg) [![codecov](https://codecov.io/gh/nebrius/eslint-plugin-fast-import/graph/badge.svg?token=T6O54TXTKU)](https://codecov.io/gh/nebrius/eslint-plugin-fast-import)

- [Installation](#installation)
- [Configuration](#configuration)
  - [Configuration options](#configuration-options)
    - [rootDir: string](#rootdir-string)
    - [alias: `Record<string, string>`](#alias-recordltstring-stringgt)
    - [entryPoints: `Array<{ file: string, symbols: string[]}>`](#entrypoints-arraylt-file-string-symbols-stringgt)
    - [ignorePatterns: `string[]`](#ignorepatterns-string)
    - [mode: `'auto' | 'one-shot' | 'fix' | 'editor'`](#mode-auto--one-shot--fix--editor)
    - [editorUpdate: `number`](#editorupdate-number)
- [Rules](#rules)
- [Algorithm](#algorithm)
  - [Phase 1: AST analysis](#phase-1-ast-analysis)
  - [Phase 2: Module specifier resolution](#phase-2-module-specifier-resolution)
  - [Phase 3: Import graph analysis](#phase-3-import-graph-analysis)
- [Comparison](#comparison)
- [Creating new rules](#creating-new-rules)
- [Frequently Asked Questions](#frequently-asked-questions)
  - [Is this plugin a replacement for eslint-plugin-import or eslint-plugin-import-x?](#is-this-plugin-a-replacement-for-eslint-plugin-import-or-eslint-plugin-import-x)
  - [Why don't you use chokidar for file watching?](#why-dont-you-use-chokidar-for-file-watching)
- [License](#license)


Fast Import implements a series of lint rules that validates imports and exports are used correctly. These rules specifically analyze who is importing what and looking for errors. Fast Import uses a novel algorithm that is significantly more performant than other import lint rules.

## Installation

```
npm install --save-dev eslint-plugin-fast-import
```

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

#### rootDir: `string`

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

#### alias: `Record<string, string>`

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

#### entryPoints: `Array<{ file: string, symbols: string[]}>`

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

#### ignorePatterns: `string[]`

A list of ignore patterns, using the format used by `.gitignore` files. Files that match these patterns are excluded from analysis.

By default, Fast Import includes the contents of all `.gitignore` files that apply to each file, taking into account nesting, between the file in question and the closest parent folder that contains a `.git` folder. In other words, if you have a fully fleshed out `.gitignore` setup, you can likely ignore this setting.

#### mode: `'auto' | 'one-shot' | 'fix' | 'editor'`

When set to `auto`, Fast Import will do it's best to set this value for you by inspecting the environment.

`one-shot` mode assumes that each file will be linted exactly once. This mode optimizes for running ESLint from the command line without the `--fix` flag. In this mode, Fast Import first creates a map of all files, but does not enable any caching because it is assumed files will not be updated throughout the duration of the run.

`fix` builds on `one-shot` by introducing the caching layer. Each time a rule is called, Fast Import updates its cache if any imports/exports are modified in a file.

Finally, `editor` mode builds on `fix` mode by adding a file watcher to looks for changes at a regular interval defined by [`editorUpdate`](#editorupdate). When changes are detected, the file map is updated. This allows Fast Import to respond to changes outside of the editor, such as when running `git checkout`, `git stash`, etc.

Note: currently, VS Code is the only supported editor. If you would like support for another editor, open an issue and I'll work with you to get the information needed to support your editor.

#### editorUpdate: `number`

Defines the rate at which Fast Import looks for file changes, and defaults to once every 5 seconds.

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

## Algorithm

Fast import works by using a pipelined algorithm that is very cache friendly. At its core, Fast Import works in three phases.

### Phase 1: AST analysis

This phase reads in every non-ignored file with a known JavaScript extension: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx` and parsed the file into an AST. The AST is then parsed into an import/export specific form optimized for import/export analysis.

For example, the import statement `import { foo } from './bar'` gets boiled down to:

```js
{
  importAlias: 'foo',
  importName: 'foo'
  importType: 'single',
  isTypeImport; false,
  moduleSpecifier: './bar',
  statementNote: <AST Node of entire import statement>
  reportNode: <AST Node of foo>
}
```

This phase is by far the most performance intensive of the three phases, comprising over 90% of total execution time on a cold cache. At the same time, information computed for each file is completely independent of information in any other file. This fact is exploited at the caching layer, because changes to any file do not result in cache invalidations to any other file.

Details for the information computed in this stage can be viewed in the [types file for base information](./src/types/base.ts).

### Phase 2: Module specifier resolution

This phase goes through every import and reexport, and resolves the module specifier to one of three types: a Node.js built-in module, a third party module in `node_modules`, or a file within `rootDir`.

This phase is the second most performance intensive of the three phases, comprising 5-6% of total execution time on a cold cache. In this phase, changes to one file may impact the information in another file. Nonetheless, determining which files is impacted is relatively straightforward, and typically does not impact a large number of other file caches. This means we can still use caching to limit how much recomputation is needed.

Details for the information computed in this stage can be viewed in the [types file for resolved information](./src/types/resolved.ts).

### Phase 3: Import graph analysis

This final stage traverses the import graph created in Phase 2 to determine the ultimate source of all imports/reexports. In addition, we determined every time an export is imported in another file, and saves that information for later.

This phase is the least performance intensive of the three, comprising just 1-2% of total execution time on a cold cache. It is also the most entangled and difficult to cache. As a result, Fast Import does not do any caching during this phase,since it has little effect on overal performance anyways.

Details for the information computed in this stage can be viewed in the [types file for resolved information](./src/types/analyzed.ts).

## Comparison

TODO

## Creating new rules

Fast import is designed to be extended. For a complete example, check out the source code for the [no-unused-exports](src/rules/unused/unused.ts) lint rule for a relatively common example, or the source code for the [no-cycle](src/rules/cycle/cycle.ts) for a complex example.

This package exports three helper functions:

### getESMInfo(context)

This is the most important of the three functions. If the file represented by the ESLint context has been analyzed Fast Import, three pieces of information are returned (otherwise `undefined` is returned)

- `fileInfo: AnalyzedCodeFileDetails`: The imports, reexports, and exports of the current file
- `projectInfo: AnalyzedProjectInfo`: The imports, reexports, and exports of the entire project
- `settings: ParsedSettings`: The computed settings, with all defaults applied, used by Fast Import

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

### registerUpdateListener(listener)

Some rules may compute their own derived information that is also performance sensitive, such as the `no-cycle` rule. In these cases, you can rely on the `registerUpdateListener` callback to be notified any time the cahce is updated.

### isNonTestFile(filePath)

A helper function to determine, using Fast Imports algorithm, whether or not a given file path represents a test file. Currently, a file is considered a test file if either a) the file is directly or indirectly inside a folder called `__test__` and/or b) the file includes `.test.` in it's name.

## Frequently Asked Questions

### Is this plugin a replacement for [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) or [eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x)?

No for the most part. Fast Import replaces a few select rules from import and import x that are known to be slow, but otherwise strives to coexist with these packages. It is recommended that you continue to use these other rules for more comprehensive import analysis.

# Why don't you use chokidar for file watching?

Chokidar is a useful library for many use cases, but in my testing it occasionally misses file changes, especially when watching a very large number of files. Fast Import is sensitive to missed changes, so chokidar wasn't the most prudent approach. Instead, the file system is polled regularly and checks modified times.

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
