# eslint-plugin-fast-import

[![npm version](https://badge.fury.io/js/eslint-plugin-fast-import.svg)](https://badge.fury.io/js/eslint-plugin-fast-import) ![ci workflow](https://github.com/nebrius/eslint-plugin-fast-import/actions/workflows/ci.yml/badge.svg) [![codecov](https://codecov.io/gh/nebrius/eslint-plugin-fast-import/graph/badge.svg?token=T6O54TXTKU)](https://codecov.io/gh/nebrius/eslint-plugin-fast-import)

- [Installation](#installation)
- [Configuration](#configuration)
- [Rules](#rules)
- [Frequently Asked Questions](#frequently-asked-questions)
- [License](#license)

Fast Import implements a series of lint rules that validates imports and exports are used correctly. These rules specifically analyze who is importing what and looking for errors.

## Installation

```
npm install --save-dev eslint-plugin-fast-import
```

## Configuration

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

## Frequently Asked Questions

### Is this plugin a replacement for [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) or [eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x)?

No for the most part. Fast import replaces a few select rules from import and import x that are known to be slow, but otherwise strives to coexist with these packages. It is recommended that you continue to use these other rules for more comprehensive import analysis.

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
