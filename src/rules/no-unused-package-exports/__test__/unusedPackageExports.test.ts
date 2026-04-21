import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { getDirname } from 'cross-dirname';

import { noUnusedPackageExports } from '../rule.js';

// Fixture rationale (see the directory tree for layout).
//
// Files that are never linted — their caches stay at the initial
// disk-loaded state for the whole run, providing stable backdrops the
// tests rely on:
//   - packages/one/internal.ts: reexport source (`UsedFromReexport`,
//     `UnusedFromReexport`, default) for the reexport tests.
//   - packages/filter/entryA.ts: supplies `EntryOnlyUnused` to
//     packageEntryPointExports so the per-file filter test genuinely
//     exercises the filter when linting filter/entryB.ts.
//
// Package isolation:
//   - packages/four: dedicated to the dynamic-import test so
//     `await import('four')` cannot blanket-mark exports in other packages.
//   - packages/filter: separate from packages/one so the filter test's
//     backdrop (entryA.ts) is not stomped by any other test's virtual code.
//
// The hasEntryPoints early-return test targets packages/one/scratch.ts
// (not internal.ts) so it doesn't disturb the reexport source.
const MONOREPO_ROOT_DIR = join(getDirname(), 'project');
const PACKAGE_ONE_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'one');
const PACKAGE_TWO_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'two');
const PACKAGE_THREE_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'three');
const PACKAGE_FOUR_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'four');
const PACKAGE_FILTER_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'filter');

const FILE_ONE_ENTRY = join(PACKAGE_ONE_DIR, 'entry.ts');
const FILE_ONE_SCRATCH = join(PACKAGE_ONE_DIR, 'scratch.ts');
const FILE_TWO_ENTRY = join(PACKAGE_TWO_DIR, 'entry.ts');
const FILE_THREE_ENTRY = join(PACKAGE_THREE_DIR, 'entry.ts');
const FILE_FOUR_ENTRY = join(PACKAGE_FOUR_DIR, 'entry.ts');
const FILE_FILTER_ENTRY_B = join(PACKAGE_FILTER_DIR, 'entryB.ts');

const MONOREPO_SETTINGS = {
  'fast-import': {
    monorepoRootDir: MONOREPO_ROOT_DIR,
    mode: 'fix' as const,
  },
};

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      // Use the monorepo-root tsconfig under `project/` for type resolution,
      // which declares path aliases for `one`, `two`, and `three`. This lets
      // TypeScript resolve cross-package imports in consumer/*.ts without
      // `@ts-expect-error` suppressions. fast-import's per-package alias
      // filter (settings.ts) drops these aliases when analyzing any package
      // whose packageRootDir doesn't contain the alias target, so these
      // imports are still treated as cross-package imports at runtime.
      projectService: true,
      tsconfigRootDir: MONOREPO_ROOT_DIR,
    },
  },
});

ruleTester.run('no-unused-package-exports', noUnusedPackageExports, {
  valid: [
    // --- Cross-package import shapes ---
    // Bare-specifier named import of the main entry (consumer/named.ts:
    // `import { Used } from 'one'`).
    {
      code: `export const Used = 1;
`,
      filename: FILE_ONE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },
    // A second bare-specifier named import in its own consumer file
    // (consumer/bareNamed.ts: `import { BareUsed } from 'one'`) to confirm
    // multiple importers independently contribute to externallyImportedBy.
    {
      code: `export const BareUsed = 1;
`,
      filename: FILE_ONE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },
    // Type-only named import (consumer/typeImport.ts:
    // `import type { TypeUsed } from 'one'`).
    {
      code: `export type TypeUsed = number;
`,
      filename: FILE_ONE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },
    // Default import targeting three (consumer/defaultImport.ts).
    {
      code: `export default 10;
`,
      filename: FILE_THREE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },
    // Barrel import of two (consumer/barrel.ts): every entry-point
    // export on two is marked externally imported regardless of name.
    {
      code: `export const BarrelExport = 1;
export const AnotherBarrelExport = 2;
`,
      filename: FILE_TWO_ENTRY,
      settings: MONOREPO_SETTINGS,
    },

    // --- Reexports as entry-point exports ---
    // Single reexport aliased to a consumer-visible name.
    {
      code: `export { UsedFromReexport as Used } from './internal';
`,
      filename: FILE_ONE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },
    // Default-as-named reexport whose resulting name is externally imported.
    {
      code: `export { default as Used } from './internal';
`,
      filename: FILE_ONE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },
    // Bare `export *` has no exportName, so it is NOT added to
    // packageEntryPointExports and does not flip `hasEntryPoints`. A file
    // whose only statement is `export *` therefore short-circuits the rule.
    // This locks in the silently-skipped behavior.
    {
      code: `export * from './internal';
`,
      filename: FILE_ONE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },
    // Named barrel reexport (`export * as NS from ...`) whose namespace name
    // IS externally imported. consumer/namespaceImport.ts does
    // `import { UsedNamespace } from 'one'`.
    {
      code: `export * as UsedNamespace from './internal';
`,
      filename: FILE_ONE_ENTRY,
      settings: MONOREPO_SETTINGS,
    },

    // --- Subpath named import + per-file filter (rule.ts:37-39) ---
    // consumer/named.ts imports `AlsoUsed` from the subpath `'filter/b'`,
    // which the tsconfig aliases to filter/entryB.ts. Linting entryB.ts
    // virtually with only `AlsoUsed` also stresses the per-file filter:
    // filter/entryA.ts is never linted in this suite, so its disk-loaded
    // `EntryOnlyUnused` stays in `packageEntryPointExports` for the whole
    // run. Without the `e.filePath === context.filename` filter, the rule
    // would report `EntryOnlyUnused` against entryB.ts.
    //
    // TODO: this scaffolding — and the per-file filter it exercises — is
    // coupled to the current collision handling, where
    // `packageEntryPointExports` is a single flat Map keyed by exportName
    // across the whole package. If/when collision handling is reworked (e.g.
    // by codifying subpath imports so each subpath has its own export
    // namespace), the per-file filter may go away entirely and this test
    // (plus its invalid counterpart below) will need to be rewritten against
    // the new structure.
    {
      code: `export const AlsoUsed = 1;
`,
      filename: FILE_FILTER_ENTRY_B,
      settings: MONOREPO_SETTINGS,
    },

    // --- Dynamic imports mark all entry-point exports as used ---
    // consumer/dynamic.ts performs `await import('four')`. Dynamic imports
    // are treated the same as barrel imports when populating
    // `externallyImportedBy` (see module.ts's iteration over singleImports +
    // barrelImports + dynamicImports, with the switch collapsing
    // 'dynamicImport' into the 'barrelImport' branch), so every entry-point
    // export of four is considered externally imported regardless of name.
    // Package four is dedicated to this test to keep the dynamic-import
    // mark from leaking into the other packages' test cases.
    {
      code: `export const DynamicImported = 1;
`,
      filename: FILE_FOUR_ENTRY,
      settings: MONOREPO_SETTINGS,
    },

    // --- Early return for files without their own entry points ---
    // `scratch.ts` is not in entryPointFiles, so `hasEntryPoints` is false
    // and the rule hits the early-return branch before inspecting any
    // exports. This case exists for coverage only: the early return is a
    // fast path, not a correctness check. If it were removed, the filter
    // `e.filePath === context.filename` below it would still return zero
    // matches for scratch.ts (no entry-point export has scratch.ts as its
    // filePath, since `hasEntryPoints` and `isEntryPoint` are set from the
    // same `entryPointFiles` check in computeBaseInfo.ts), so this test
    // would still pass. We keep the test to pin the coverage on the branch;
    // its existence does not by itself prove the branch's behavior is
    // required.
    //
    // This test targets `scratch.ts` rather than `internal.ts` so that
    // `internal.ts`'s cache stays at its disk-loaded contents for the whole
    // test run; the invalid reexport tests below rely on that to resolve
    // `UsedFromReexport`, `UnusedFromReexport`, and default against the real
    // disk exports.
    {
      code: `export const scratch = 1;
export const alsoScratch = 2;
`,
      filename: FILE_ONE_SCRATCH,
      settings: MONOREPO_SETTINGS,
    },
  ],

  invalid: [
    // --- Direct exports ---
    // Single unused export; also verifies `{{ name }}` interpolation.
    {
      code: `export const Unused = 1;
`,
      filename: FILE_ONE_ENTRY,
      errors: [{ messageId: 'noUnusedPackageExports', data: { name: 'Unused' } }],
      settings: MONOREPO_SETTINGS,
    },
    // Mixed used/unused reports only the unused one.
    {
      code: `export const Used = 1;
export const Unused = 2;
`,
      filename: FILE_ONE_ENTRY,
      errors: [{ messageId: 'noUnusedPackageExports', data: { name: 'Unused' } }],
      settings: MONOREPO_SETTINGS,
    },
    // Each unused export gets its own report.
    {
      code: `export const FirstUnused = 1;
export const SecondUnused = 2;
`,
      filename: FILE_ONE_ENTRY,
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'FirstUnused' } },
        { messageId: 'noUnusedPackageExports', data: { name: 'SecondUnused' } },
      ],
      settings: MONOREPO_SETTINGS,
    },
    // Default export's `exportName` is the literal string 'default', so the
    // interpolated message carries `default` (not the `<unnamed>` fallback,
    // which is only reachable for defensive reasons).
    {
      code: `export default 10;
`,
      filename: FILE_ONE_ENTRY,
      errors: [{ messageId: 'noUnusedPackageExports', data: { name: 'default' } }],
      settings: MONOREPO_SETTINGS,
    },

    // --- Reexports ---
    // Single reexport whose resulting export name is not imported.
    {
      code: `export { UnusedFromReexport } from './internal';
`,
      filename: FILE_ONE_ENTRY,
      errors: [
        {
          messageId: 'noUnusedPackageExports',
          data: { name: 'UnusedFromReexport' },
        },
      ],
      settings: MONOREPO_SETTINGS,
    },
    // Default-as-named reexport whose alias is not imported.
    {
      code: `export { default as Foo } from './internal';
`,
      filename: FILE_ONE_ENTRY,
      errors: [{ messageId: 'noUnusedPackageExports', data: { name: 'Foo' } }],
      settings: MONOREPO_SETTINGS,
    },
    // Named barrel reexport (`export * as NS from ...`) whose namespace name
    // is not imported.
    {
      code: `export * as Namespace from './internal';
`,
      filename: FILE_ONE_ENTRY,
      errors: [{ messageId: 'noUnusedPackageExports', data: { name: 'Namespace' } }],
      settings: MONOREPO_SETTINGS,
    },

    // --- Per-file filter, invalid side ---
    // Only entryB.ts's own unused export is reported; filter/entryA.ts's
    // `EntryOnlyUnused` must not leak into entryB.ts's report list. See the
    // TODO on the valid-side per-file-filter case above for the caveat about
    // how this test is coupled to the current collision handling.
    {
      code: `export const AlsoUnused = 1;
`,
      filename: FILE_FILTER_ENTRY_B,
      errors: [{ messageId: 'noUnusedPackageExports', data: { name: 'AlsoUnused' } }],
      settings: MONOREPO_SETTINGS,
    },
  ],
});
