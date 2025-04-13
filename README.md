# eslint-plugin-fast-import

[![npm version](https://badge.fury.io/js/eslint-plugin-fast-import.svg)](https://badge.fury.io/js/eslint-plugin-fast-import) ![ci workflow](https://github.com/nebrius/eslint-plugin-fast-import/actions/workflows/ci.yml/badge.svg) [![codecov](https://codecov.io/gh/nebrius/eslint-plugin-fast-import/graph/badge.svg?token=T6O54TXTKU)](https://codecov.io/gh/nebrius/eslint-plugin-fast-import)

- [Installation](#installation)
- [Configuration](#configuration)
- [Rules](#rules)
- [Performance and Tradeoffs](#performance-and-limitations)
- [Frequently Asked Questions](#frequently-asked-questions)
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

#### rootDir: string

Fast Import uses `rootDir` to scan for files. When Fast Import start up for the first time, it creates a map of all files in a project. Fast Import finds all files inside of `rootDir`, filters out any ignored files (see [ignorePatterns](#ignorepatterns) for more info), and analyzes remaining files.

By default, Fast Import looks for a `tsconfig.json` file in the same directory as the ESLing configuration file, and uses the `rootDir` value from the TypeScript config file. If `tsconfig.json` does not exist or it does not set `rootDir`, then `rootDir` is set to the directory containing the ESLint configuration file.

Performance warning: if you set `rootDir` to a folder contianing `node_modules`, performance will suffer. Even though files inside of `node_modules` are typically ignored, it still take a small amount of time to filter them out. This especially matters in `editor` mode.

Example:

```js
recommended({
  rootDir: './src'
})
```

Note: `rootDir` is relative to the directory containing your ESLint configuration file

#### alias: Record&lt;string, string&gt;

Import alias paths. For example, if you use Next.js with default configuration, then an alias is automatically set so that `@/` points to `src/`, such that a file inside of `src` can import `src/components/foo/index.ts` with `@/components/foo`.

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

#### entryPoints: Array&lt;{ file: string, symbols: string[]}&gt;

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

#### mode

One of `auto`, `one-shot`, `fix`, `editor`. When set to `auto`, Fast Import will attempt to set this value for you by inspecting the environment.

`one-shot` mode assumes that each file will be linted exactly once. This mode optimizes for running ESLint from the command line without the `--fix` flag. In this mode, Fast Import first creates a map of all files

`fix` builds on `one-shot` by introducing a caching layer. Each time a rule is called, Fast Import updates cache if any imports/exports are modified.

Finally, `editor` adds a file watcher to looks for changes at a regular interval defined by [`editorUpdate`](#editorupdate). When changes are detected, the file map is updated. This allows Fast Import to respond to changes outside of the editor, such as when running `git checkout`, `git stash`, etc.

Note: currently, VS Code is the only supported editor. If you would like support for another editor, open an issue and I'll work with you to get the information needed to support your editor.

#### editorUpdate

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

## Performance and Tradeoffs

TODO: overview of algorithm

TODO: show results

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
