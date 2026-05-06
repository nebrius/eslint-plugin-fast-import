# CHANGELOG

## 3.0.0

Version 3 introduces a fairly large refactor of the plugin's configuration system. This refactor enables users to configure a single, root-level ESLint/Oxlint config in a monorepo that covers all packages, instead of requiring a separate ESLint/Oxlint config in each package. As such, there are a variety of smaller breaking changes detailed below.

### Breaking changes

#### Configuration

- Removed `all()` and `recommended()` config helpers, and removed the `all` config
  - These helpers became less useful due to other changes
  - Given that they were a departure from standard plugin configuration mechanisms, I think the value they brought is now outweighed by the confusion they caused
  - Use `importIntegrityPlugin.configs.recommended`, `importIntegrityPlugin.configs.monorepoRecommended`, and `importIntegrityPlugin.configs.off`
  - `monorepoRecommended` is additive to `recommended`, not a replacement; enable both if you want the standard recommended rules plus the monorepo-only rule
  - Put plugin settings in `settings['import-integrity']`
  - The `all` config was removed because, with the rules that were previously only in `all` now folded into `recommended`, there was no longer any meaningful difference between the two
- Replaced `entryPoints` with `entryPointFiles` and `externallyImported` with `externallyImportedFiles`
  - Previously, `entryPoints`/`externallyImported` indicated a list of exports from a given file that were considered for analysis. In practice this has proven difficult for users to maintain, so basically everyone wrote `/.*/` to include all exports from that file.
  - Regexes themselves are tricky, since they're not serializable, so we also added a change to allow `{ regexp: "..." }` objects to be used instead of strings, further complicating configuration
  - The new approach is to simply specify files, inside of which _all_ exports are considered entry points/externally imported
  - `entryPointFiles` now uses a `package.json` `exports`-style subpath map instead of per-symbol file entries
  - `externallyImportedFiles` is now a list of gitignore-style file patterns
- Reworked `import-integrity.config.json`/`import-integrity.config.jsonc` handling
  - Repo-scoped settings such as `packageRootDir`/`monorepoRootDir`, `mode`, `editorUpdateRate`, and `debugLogging` now live only in `settings['import-integrity']`
  - Import Integrity config files are now package-scoped and must live in the package root
  - In single-repo mode, a package config file in `packageRootDir` is auto-discovered
  - In single-repo mode, you can define package-scoped options in `settings['import-integrity']` or in the package config file, but not both
- Renamed `rootDir` to `packageRootDir` across all API surfaces
  - The previous naming was a little confusing. It is intended to point to the directory containing `tsconfig.json`, and setting it to a nested `src` directory would cause Import Integrity to not parse `tsconfig.json` and automatically detect aliases, etc., even though tsconfig's `rootDir` option _is_ intended to point to `src`
- `recommended` config now sets `require-node-prefix` to `error`
  - Previously this rule was set to `off` in `recommended` and `error` only in `all`. With `all` removed, `recommended` now enables it.
  - To preserve the previous behavior, add `'import-integrity/require-node-prefix': 'off'` to your config.
- Default ignore folder list expanded to include folders that start with a dot (e.g. `.git`, `.next`, etc.) and `out`
  - The hard-coded list was also adjusted: `node_modules`, `dist`, `build`, and `out` are always ignored, and any path segment starting with `.` is ignored (which subsumes the previous explicit `.git` entry)
- Config files matching `/*.config.*` are now automatically treated as externally imported
  - If you previously specified these entries in your config, you can remove them

#### Rules

- Removed the `consistent-file-extensions` rule
  - This rule papered over gaps in tooling that is no longer needed, and was difficult to use and maintain properly
- The `no-unused-exports` rule was split into two rules: `no-unused-exports` and `no-test-only-imports`
  - The previous version of `no-unused-exports` also checked whether exports were only imported by tests, and `allowNonTestTypeExports` controlled whether type-only exports were exempt from that check
  - To preserve the previous behavior if you manually enabled `import-integrity/no-unused-exports`, also enable `import-integrity/no-test-only-imports`
  - There is no direct replacement for `allowNonTestTypeExports: false`; `no-test-only-imports` now always ignores type-only exports
  - The two new rules no longer take any options

#### Helper API

- `getESMInfo` return shape changed:
  - `projectInfo` was renamed to `packageInfo`, and `packageInfo.rootDir` was renamed to `packageInfo.packageRootDir`
  - `settings` was renamed to `packageSettings`, reflecting the new monorepo-aware settings model
- `isNonTestFile` signature simplified from `isNonTestFile(filePath, rootDir, settings)` to `isNonTestFile(filePath)`. Settings are now resolved internally from the cached package settings for the file.
- `registerUpdateListener` callback now receives a per-package `packageRootDir` rather than the configured top-level root. In monorepo mode this means the listener may be invoked once per package.
- See `src/types/base.ts`, `src/types/resolved.ts`, and `src/types/analyzed.ts` for details on the type-shape changes that come with the renames above.

### Added

#### Configuration

- Monorepo root-config mode
  - Set `monorepoRootDir` (mutually exclusive with `packageRootDir`) in your root ESLint/Oxlint config to enable a single config that covers all packages
  - Repo-scoped settings stay in `settings['import-integrity']`; workspace packages are discovered from the monorepo's declared workspaces via `@manypkg/get-packages`
  - Each discovered workspace package becomes a Import Integrity `packageRootDir`; if `import-integrity.config.json`/`import-integrity.config.jsonc` exists at that package root, its package-scoped settings are loaded
  - Discovered workspace packages without a Import Integrity config file are still analyzed with default package-level settings, and stray config files outside declared workspace globs are ignored
  - Monorepo packages should define `package.json.name`; cross-package analysis and package entry-point matching depend on it
- Support for `import-integrity.config.jsonc` files, including comments and trailing commas in both `.json` and `.jsonc` config files
- Next.js auto-detection: when Next.js is detected, default `externallyImportedFiles` patterns for app router, pages router, and mixed-router projects (with or without a `src/` directory) are pre-applied. User-supplied patterns override the defaults.
- Entry point inference: when `package.json` declares `main`/`exports` and `tsconfig.json` declares both `outDir` and `rootDir`, Import Integrity now derives `entryPointFiles` from the compiled `exports` paths automatically. User-supplied `entryPointFiles` still takes precedence.

#### Rules

- Added the `no-empty-entry-points` rule (in `recommended`): flags files matched by `entryPointFiles`/`externallyImportedFiles` that have no exports
- Added the `no-unnamed-entry-point-exports` rule (in `recommended`): flags bare `export * from './x'` in entry-point files; named barrel reexports (`export * as foo from ...`) are still allowed
- Added the `no-unused-package-exports` rule (in `monorepoRecommended`): cross-package version of `no-unused-exports` that reports entry-point exports that are not imported by any other package in the monorepo
  - `monorepoRecommended` only enables this monorepo-only rule; also enable `recommended` if you want the standard recommended rules
  - This rule depends on `monorepoRootDir` workspace package discovery and does not work when Import Integrity only sees isolated package-local ESLint/Oxlint configs
- `no-test-only-imports` and `no-test-imports-in-prod` were both updated to be aware of non-test file exports prefixed with `_testOnly`. When a non-test file exports something with this prefix, it is considered a test-only export and can be imported by test files but not by production code.
- Cross-package import analysis now considers dynamic imports (statically-resolvable specifiers are tracked; non-static specifiers are skipped) and resolves third-party package exports using `package.json` `exports` subpaths and conditions

### Fixed

- Fixed a bug where packages could be incorrectly matched to a wrong package folder if multiple packages share the same prefix (e.g. matching `/foo` instead of `/foo-bar`)
- Fixed a bug where imports that resolved to third party types weren't getting root module type set correctly
- Fixed a bug where Oxlint was not running in editor mode
- Fixed a bug where files outside any workspace-discovered package would cause analysis failures; these files are now safely skipped
- Hardened `package.json` reading against malformed or partially-populated files

## 2.2.1 (4/9/2026)

- Added missing export for `getLocFromRange`

## 2.2.0 (3/26/2026)

- Added support for `regexp` property in `entryPoints` and `externallyImported` options
- Added formal support for Oxlint

## 2.1.0 (3/13/2026)

- Fixed logic errors in `prefer-alias-imports` rule
  - Renamed `relative-if-descendant` mode to `relative-if-local` to accurately represent what it actually does
  - Technically this is a breaking change, but due to the previous release being so recent and very few downloads of 2.0.0, I'm instead going to just deprecate 2.0.0
- Added configurable `minSharedPathDepth` option to `prefer-alias-imports` rule

## 2.0.0 (3/13/2026)

- Added `prefer-alias-imports` rule
- BREAKING CHANGE: added `prefer-alias-imports` rule to the recommend and all configs
  - This rule is likely to cause new errors in codebases that use aliases and have the recommended or all configs enabled
  - To disable this rule to preserve existing behavior, add `"import-integrity/prefer-alias-imports": "off"` to your eslint config.

## 1.12.0 (2/15/2026)

- Added `externallyImported` option

## 1.11.0 (2/15/2026)

- Added support for reading config from a separate JSON file
- Fixed a bug where a file importing itself would cause a crash

## 1.10.0 (1/28/2026)

- Added `no-node-builtins` rule

## 1.9.2 (1/25/2026)

- Fixed bug where tsconfig with non-relative extends was not being resolved correctly

## 1.9.1 (1/25/2026)

- Fixed bug where exports with the same name (e.g. TypeScript function overloads) were not being deduped properly

## 1.9.0 (1/16/2026)

- Added `testFilePatterns` option

## 1.8.0 (1/14/2026)

- Added `ignoreOverridePatterns` option

## 1.7.1 (1/3/2026)

- Fixed bug where `requireFileExtensions` option was causing settings validation to fail

## 1.7.0 (1/2/2026)

- Added `requireFileExtensions` option to configuration helpers

## 1.6.0 (1/2/2026)

- Removed support for implicit workspace dependency resolution
  - npm workspaces, but not pnpm or yarn workspaces, have an (unintentional?) side effect that you can import other cross-repo packages without specifying them in package.json.
  - This is generally a bad-practice, and can be solved by explicitly listing the package as `"@scope/package-name": "*"` in package.json to achieve the same behavior.
- Updated dependencies

## 1.5.3 (10/30/2025)

- Cleaned up caching updates in monorepos

## 1.5.2 (10/21/2025)

- Fixed bug where type imports from a package where only the DefinitelyTyped
  package was installed were not being recognized as listed in package.json

## 1.5.1 (10/1/2025)

- Added fixer to `consistent-file-extensions` rule

## 1.5.0 (10/1/2025)

- Added `consistent-file-extensions` rule

## 1.4.4 (9/24/2025)

- More monorepo bug fixes

## 1.4.3 (9/11/2025)

- Fixed a bug with the recent bug fix

## 1.4.2 (9/11/2025)

- Fixed a bug where caching didn't work properly in monorepos

## 1.4.1 (9/8/2025)

- Added support for excluding type imports in `no-restricted-imports`

## 1.4.0 (9/8/2025)

- Fixed bug in `no-unused-exports` rule where it generated a false positive if
  a reexport was later reexported as an entry point
- Added support for regex matches in `no-restricted-imports` in allowed/denied
  options

## 1.3.0 (7/12/2025)

- Added support for defining entry point symbols using regex

## 1.2.0 (6/16/2025)

- Added `no-restricted-imports` rule

## 1.1.2 (5/18/2025)

- Relaxed a few settings checks to warn instead of throwing an error
- Settings are now updated on file system polling

## 1.1.1 (5/10/2025)

- Added `no-named-as-default` rule
- Brought in the latest version of OXC Parser to fix a bug

## 1.0.3 (5/7/2025)

- Fixed a bug where file sync total time wasn't reporting the correct value

## 1.0.2 (5/7/2025)

- Added support for Windsurf

## 1.0.1 (4/27/2025)

- Initial release
