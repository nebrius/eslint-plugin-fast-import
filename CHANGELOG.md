# CHANGELOG

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
