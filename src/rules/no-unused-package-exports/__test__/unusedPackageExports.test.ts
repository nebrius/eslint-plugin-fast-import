import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noUnusedPackageExports } from '../rule.js';

// Fixture rationale (see the directory tree for layout).
//
// Files that are never linted — their caches stay at the initial
// disk-loaded state for the whole run, providing stable backdrops the
// tests rely on:
//   - packages/one/internal.ts: reexport source (`UsedFromReexport`,
//     `UnusedFromReexport`, default) for the reexport tests.
//
// Package isolation:
//   - packages/four: dedicated to the dynamic-import test so
//     `await import('four')` cannot blanket-mark exports in other packages.
//
// The entryPointSpecifier early-return test targets packages/one/scratch.ts
// (not internal.ts) so it doesn't disturb the reexport source.
// project/lerna.json is load-bearing: @manypkg uses it to detect this fixture
// as a Lerna monorepo.
const MONOREPO_ROOT_DIR = join(import.meta.dirname, 'project');
const PACKAGE_ONE_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'one');
const PACKAGE_TWO_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'two');
const PACKAGE_THREE_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'three');
const PACKAGE_FOUR_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'four');
// packages/five intentionally has folder name `five` but package.json name
// `pkg-five` so the ignorePackages tests can prove the rule matches against
// the package name, not the folder name.
const PACKAGE_FIVE_DIR = join(MONOREPO_ROOT_DIR, 'packages', 'five');

const FILE_ONE_ENTRY = join(PACKAGE_ONE_DIR, 'entry.ts');
const FILE_ONE_SCRATCH = join(PACKAGE_ONE_DIR, 'scratch.ts');
const FILE_TWO_ENTRY = join(PACKAGE_TWO_DIR, 'entry.ts');
const FILE_THREE_ENTRY = join(PACKAGE_THREE_DIR, 'entry.ts');
const FILE_FOUR_ENTRY = join(PACKAGE_FOUR_DIR, 'entry.ts');
const FILE_FIVE_ENTRY = join(PACKAGE_FIVE_DIR, 'entry.ts');

const MONOREPO_SETTINGS = {
  'import-integrity': {
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
      // `@ts-expect-error` suppressions. import-integrity's per-package alias
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
    // Bare `export *` produces a `barrelReexport` whose `exportName` is
    // undefined; the rule's `if (!exportEntry.exportName) continue` skip
    // keeps the report list empty for such entries.
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
    // `scratch.ts` is not in entryPointFiles, so `entryPointSpecifier` is
    // undefined and the rule hits the early-return branch before inspecting
    // any exports.
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

    // --- ignorePackages option ---
    // Package five is folder `five` / name `pkg-five`. Listing the package
    // name suppresses what would otherwise be an unused-export report.
    {
      code: `export const Unused = 1;
`,
      filename: FILE_FIVE_ENTRY,
      options: [{ ignorePackages: ['pkg-five'] }],
      settings: MONOREPO_SETTINGS,
    },
    // Multiple entries in ignorePackages: matching is by `includes`, not just
    // the first element.
    {
      code: `export const Unused = 1;
`,
      filename: FILE_FIVE_ENTRY,
      options: [{ ignorePackages: ['one', 'pkg-five'] }],
      settings: MONOREPO_SETTINGS,
    },
    // ignorePackages set, but the file under lint belongs to a non-ignored
    // package whose export is actually imported elsewhere — still valid,
    // confirming the option doesn't perturb the normal path for other
    // packages.
    {
      code: `export const Used = 1;
`,
      filename: FILE_ONE_ENTRY,
      options: [{ ignorePackages: ['pkg-five'] }],
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
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'Unused' } },
      ],
      settings: MONOREPO_SETTINGS,
    },
    // Mixed used/unused reports only the unused one.
    {
      code: `export const Used = 1;
export const Unused = 2;
`,
      filename: FILE_ONE_ENTRY,
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'Unused' } },
      ],
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
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'default' } },
      ],
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
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'Namespace' } },
      ],
      settings: MONOREPO_SETTINGS,
    },

    // --- ignorePackages option (negative cases) ---
    // The folder name (`five`) must NOT match — matching is against the
    // package.json `name` field (`pkg-five`).
    {
      code: `export const Unused = 1;
`,
      filename: FILE_FIVE_ENTRY,
      options: [{ ignorePackages: ['five'] }],
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'Unused' } },
      ],
      settings: MONOREPO_SETTINGS,
    },
    // ignorePackages contains unrelated package names — current package
    // (`pkg-five`) is not in the list, so reports still fire.
    {
      code: `export const Unused = 1;
`,
      filename: FILE_FIVE_ENTRY,
      options: [{ ignorePackages: ['one', 'two'] }],
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'Unused' } },
      ],
      settings: MONOREPO_SETTINGS,
    },
    // Empty ignorePackages array must be a no-op (guards against treating
    // empty list as "ignore everything").
    {
      code: `export const Unused = 1;
`,
      filename: FILE_FIVE_ENTRY,
      options: [{ ignorePackages: [] }],
      errors: [
        { messageId: 'noUnusedPackageExports', data: { name: 'Unused' } },
      ],
      settings: MONOREPO_SETTINGS,
    },
  ],
});
