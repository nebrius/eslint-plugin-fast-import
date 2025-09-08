# CHANGELOG

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
