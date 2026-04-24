import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { AnalyzedCodeFileDetails } from '../../../../types/analyzed.js';
import { getProjectInfo, initializeRepo } from '../../../module.js';

function assertDefined<T>(
  value: T,
  message: string
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

// Regression guard for the `initializePackageInfo` duplication bug: the bug
// pushed the same `importEntry` object reference into `externallyImportedBy`
// more than once. Track object identity directly so this guard stays accurate
// even when fixtures legitimately contain multiple imports of the same type
// from the same file (which would share `(filePath, importEntry.type)` but not
// object identity).
function expectNoDuplicateExternalImporters(
  entries: ReadonlyArray<{ importEntry: object }>
) {
  const seen = new WeakSet<object>();
  for (const entry of entries) {
    expect(seen.has(entry.importEntry)).toBe(false);
    seen.add(entry.importEntry);
  }
}

function findExport(fileDetails: AnalyzedCodeFileDetails, exportName: string) {
  return [
    ...fileDetails.exports,
    ...fileDetails.singleReexports,
    ...fileDetails.barrelReexports,
  ].find((entry) => entry.exportName === exportName);
}

const MONOREPO_PROJECT_DIR = join(getDirname(), 'project', 'monorepo');
const PACKAGES_DIR = join(MONOREPO_PROJECT_DIR, 'packages');
const PACKAGE_A_DIR = join(PACKAGES_DIR, 'packageA');
const PACKAGE_B_DIR = join(PACKAGES_DIR, 'packageB');
const PACKAGE_C_DIR = join(PACKAGES_DIR, 'packageC');
const PACKAGE_D_DIR = join(PACKAGES_DIR, 'packageD');
const PACKAGE_E_DIR = join(PACKAGES_DIR, 'packageE');

const FILE_A = join(PACKAGE_A_DIR, 'a.ts');
const FILE_B = join(PACKAGE_B_DIR, 'b.ts');
const FILE_C = join(PACKAGE_C_DIR, 'c.ts');
const FILE_D = join(PACKAGE_D_DIR, 'd.ts');
const FILE_E = join(PACKAGE_E_DIR, 'e.ts');

function initialize() {
  initializeRepo({
    filename: FILE_A,
    settings: {
      'fast-import': { monorepoRootDir: MONOREPO_PROJECT_DIR },
    },
  });
}

it('Cross-package import cycle populates externallyImportedBy on both sides', () => {
  initialize();

  // packageA's A is imported by both packageB (single) and packageE (barrel);
  // check the single importer from packageB here. The barrel importer from
  // packageE is checked in the dedicated barrel-import test.
  const pkgAInfo = getProjectInfo(PACKAGE_A_DIR);
  const fileA = pkgAInfo.packageEntryPointExports.get('@test/package-a');
  assertDefined(fileA, '@test/package-a entry point missing on packageA');
  const aExport = findExport(fileA, 'A');
  assertDefined(aExport, 'A export missing on @test/package-a');
  expect(aExport).toMatchObject({
    type: 'export',
    exportName: 'A',
    isTypeExport: true,
    isEntryPoint: true,
    isExternallyImported: false,
  });
  const aSingleImporters = aExport.externallyImportedBy.filter(
    (entry) => entry.importEntry.type === 'singleImport'
  );
  expect(aSingleImporters).toHaveLength(1);
  expect(aSingleImporters[0]).toMatchObject({
    packageRootDir: PACKAGE_B_DIR,
    filePath: FILE_B,
    importEntry: {
      type: 'singleImport',
      importName: 'A',
      moduleSpecifier: '@test/package-a',
    },
  });
  expectNoDuplicateExternalImporters(aExport.externallyImportedBy);

  const pkgBInfo = getProjectInfo(PACKAGE_B_DIR);
  const fileB = pkgBInfo.packageEntryPointExports.get('@test/package-b/b');
  assertDefined(fileB, '@test/package-b/b entry point missing on packageB');
  const bExport = findExport(fileB, 'B');
  assertDefined(bExport, 'B export missing on @test/package-b/b');
  expect(bExport).toMatchObject({
    type: 'export',
    exportName: 'B',
    isTypeExport: true,
    isEntryPoint: true,
    isExternallyImported: false,
  });
  expect(bExport.externallyImportedBy).toHaveLength(1);
  expect(bExport.externallyImportedBy[0]).toMatchObject({
    packageRootDir: PACKAGE_A_DIR,
    filePath: FILE_A,
    importEntry: {
      type: 'singleImport',
      importName: 'B',
      moduleSpecifier: '@test/package-b/b',
    },
  });
  expectNoDuplicateExternalImporters(bExport.externallyImportedBy);
});

it('Cross-package barrelImport populates externallyImportedBy on every entry-point export', () => {
  initialize();

  const pkgAInfo = getProjectInfo(PACKAGE_A_DIR);
  const fileA = pkgAInfo.packageEntryPointExports.get('@test/package-a');
  assertDefined(fileA, '@test/package-a entry point missing on packageA');
  const aExport = findExport(fileA, 'A');
  assertDefined(aExport, 'A export missing on @test/package-a');

  const barrelImporters = aExport.externallyImportedBy.filter(
    (entry) => entry.importEntry.type === 'barrelImport'
  );
  expect(barrelImporters).toHaveLength(1);
  expect(barrelImporters[0]).toMatchObject({
    packageRootDir: PACKAGE_E_DIR,
    filePath: FILE_E,
    importEntry: {
      type: 'barrelImport',
      moduleSpecifier: '@test/package-a',
    },
  });
  expectNoDuplicateExternalImporters(aExport.externallyImportedBy);
});

it('Named barrel reexport entry point tracks cross-package importer', () => {
  initialize();

  const pkgDInfo = getProjectInfo(PACKAGE_D_DIR);
  const fileD = pkgDInfo.packageEntryPointExports.get('@test/package-d/d');
  assertDefined(fileD, '@test/package-d/d entry point missing on packageD');
  const utilsExport = findExport(fileD, 'utils');
  assertDefined(utilsExport, 'utils export missing on @test/package-d/d');
  expect(utilsExport).toMatchObject({
    type: 'barrelReexport',
    exportName: 'utils',
    isEntryPoint: true,
    isExternallyImported: false,
  });
  expect(utilsExport.externallyImportedBy).toHaveLength(1);
  expect(utilsExport.externallyImportedBy[0]).toMatchObject({
    packageRootDir: PACKAGE_C_DIR,
    filePath: FILE_C,
    importEntry: {
      type: 'singleImport',
      importName: 'utils',
      moduleSpecifier: '@test/package-d/d',
    },
  });
  expectNoDuplicateExternalImporters(utilsExport.externallyImportedBy);
});

it('Entry-point export that is not imported by any other package has empty externallyImportedBy', () => {
  initialize();

  const pkgCInfo = getProjectInfo(PACKAGE_C_DIR);
  const fileC = pkgCInfo.packageEntryPointExports.get('@test/package-c');
  assertDefined(fileC, '@test/package-c entry point missing on packageC');
  const cExport = findExport(fileC, 'C');
  assertDefined(cExport, 'C export missing on @test/package-c');
  expect(cExport).toMatchObject({
    type: 'export',
    exportName: 'C',
    isTypeExport: false,
    isEntryPoint: true,
    isExternallyImported: false,
  });
  expect(cExport.externallyImportedBy).toEqual([]);
  expectNoDuplicateExternalImporters(cExport.externallyImportedBy);
});

it('Entry-point files for all four packages appear in packageEntryPointExports keyed by specifier', () => {
  initialize();

  // For each package, pin three invariants at once:
  //   1. The map is keyed by the expected specifier.
  //   2. The file registered under that specifier is the exact same object in
  //      `files`, and its own `entryPointSpecifier` round-trips back to the
  //      map key.
  //   3. Every named export/reexport on that file is marked
  //      `isEntryPoint: true`, which is the per-export fidelity the pre-
  //      refactor `Map<exportName, exportEntry>` test used to provide.
  const cases: Array<{
    dir: string;
    filePath: string;
    specifier: string;
    expectedExportNames: string[];
  }> = [
    {
      dir: PACKAGE_A_DIR,
      filePath: FILE_A,
      specifier: '@test/package-a',
      expectedExportNames: ['A'],
    },
    {
      dir: PACKAGE_B_DIR,
      filePath: FILE_B,
      specifier: '@test/package-b/b',
      expectedExportNames: ['B'],
    },
    {
      dir: PACKAGE_C_DIR,
      filePath: FILE_C,
      specifier: '@test/package-c',
      expectedExportNames: ['C'],
    },
    {
      dir: PACKAGE_D_DIR,
      filePath: FILE_D,
      specifier: '@test/package-d/d',
      // `d.ts` has exactly one named barrel reexport: `export * as utils from
      // './internal.js'`. That entry must be marked as an entry-point export.
      expectedExportNames: ['utils'],
    },
  ];

  for (const { dir, filePath, specifier, expectedExportNames } of cases) {
    const info = getProjectInfo(dir);
    expect([...info.packageEntryPointExports.keys()]).toEqual([specifier]);
    const registeredFile = info.packageEntryPointExports.get(specifier);
    expect(registeredFile).toBe(info.files.get(filePath));
    expect(registeredFile?.entryPointSpecifier).toBe(specifier);

    assertDefined(registeredFile, `${specifier} entry point missing`);
    const allExportEntries = [
      ...registeredFile.exports,
      ...registeredFile.singleReexports,
      ...registeredFile.barrelReexports,
    ];
    for (const entry of allExportEntries) {
      expect(entry.isEntryPoint).toBe(true);
    }
    expect(
      allExportEntries
        .map((entry) => entry.exportName)
        .filter((name): name is string => name !== undefined)
        .sort()
    ).toEqual([...expectedExportNames].sort());
  }
});

it('Files inside packageD beyond the entry point are reachable via getProjectInfo', () => {
  initialize();

  const pkgDInfo = getProjectInfo(PACKAGE_D_DIR);
  // d.ts, internal.ts, internal2.ts, package.json, fast-import.config.json = 5
  expect(pkgDInfo.files.size).toBe(5);
  expect(pkgDInfo.files.has(FILE_D)).toBe(true);
  expect(pkgDInfo.files.has(join(PACKAGE_D_DIR, 'internal.ts'))).toBe(true);
  expect(pkgDInfo.files.has(join(PACKAGE_D_DIR, 'internal2.ts'))).toBe(true);
});
